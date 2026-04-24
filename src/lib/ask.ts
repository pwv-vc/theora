import { writeFileSync, mkdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import matter from 'gray-matter'
import { kbPaths, requireKbRoot } from './paths.js'
import { llm, llmStream } from './llm.js'
import { listWikiArticles, readWikiIndex, normalizeLinks, readWikiArticle, type WikiArticle } from './wiki.js'
import { findRelevantArticles, buildContext, buildContextBatches } from './query.js'
import { slugifyShort, normalizeTag } from './utils.js'
import {
  MD_SYSTEM,
  buildMdUserPrompt,
  BATCH_EXTRACT_SYSTEM,
  buildBatchExtractPrompt,
  SYNTHESIZE_SYSTEM,
  buildSynthesizePrompt,
} from './prompts/index.js'

const MODEL_MAX_TOKENS = 128_000
const SINGLE_BATCH_SAFETY_MARGIN = 20_000 // Reserve for system, question, index, response, overhead
const SYNTHESIS_MAX_FACTS_TOKENS = 50_000
const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export interface AskOptions {
  tag?: string
  entity?: string
  file?: boolean
  onChunk: (text: string) => void
  /** After index + ranked context are ready, before the model streams. */
  onContextBuilt?: () => void
  /** First token from the model (useful to stop a "generating" spinner). */
  onFirstAnswerChunk?: () => void
  /** Enable debug mode to see ranking details */
  debug?: boolean
  /** Max wiki articles to include in context (overrides config) */
  maxContext?: number
}

export interface RankedContextInfo {
  wikiArticles: { title: string; path: string; rank?: number }[]
  outputArticles: { title: string; path: string }[]
  totalWikiConsidered: number
  tagFilter?: string
  entityFilter?: string
}

export interface AskResult {
  rawAnswer: string
  filedPath: string | null
  rankedInfo?: RankedContextInfo
}

export interface AskContext {
  index: string
  context: string
  contextBatches: string[]
  allArticles: ReturnType<typeof listWikiArticles>
  rankedInfo?: RankedContextInfo
}

export async function buildAskContext(question: string, tag?: string, maxContext?: number, entity?: string): Promise<AskContext> {
  const root = requireKbRoot()
  const paths = kbPaths(root)

  const index = readWikiIndex()
  const allArticles = listWikiArticles()

  let outputArticles = allArticles.filter(a => a.path.startsWith(paths.output))
  let wikiArticles = allArticles.filter(a => a.path.startsWith(paths.wiki))

  if (tag) {
    const normalizedTag = normalizeTag(tag)
    wikiArticles = wikiArticles.filter(a =>
      a.tags.some(t => normalizeTag(t) === normalizedTag),
    )
    outputArticles = outputArticles.filter(a =>
      a.tags.some(t => normalizeTag(t) === normalizedTag),
    )
  }

  if (entity) {
    const normalizedEntity = entity.toLowerCase()
    wikiArticles = wikiArticles.filter(a => {
      if (!a.entities) return false
      return Object.entries(a.entities).some(([type, names]) =>
        names.some(name => `${type}/${name}`.toLowerCase() === normalizedEntity)
      )
    })
    outputArticles = outputArticles.filter(a => {
      if (!a.entities) return false
      return Object.entries(a.entities).some(([type, names]) =>
        names.some(name => `${type}/${name}`.toLowerCase() === normalizedEntity)
      )
    })
  }

  const rankingResult = await findRelevantArticles(question, index, wikiArticles, maxContext)
  const relevant = rankingResult.articles
  const combinedArticles = [...relevant, ...outputArticles]
  const context = buildContext(combinedArticles)
  const contextBatches = buildContextBatches(combinedArticles)

  const rankedInfo: RankedContextInfo = {
    wikiArticles: rankingResult.articles.map(a => ({ title: a.title, path: a.relativePath, rank: a.rank })),
    outputArticles: outputArticles.map(a => ({ title: a.title, path: a.relativePath })),
    totalWikiConsidered: rankingResult.totalConsidered,
    tagFilter: tag,
    entityFilter: entity,
  }

  return { index, context, contextBatches, allArticles, rankedInfo }
}

export async function streamAsk(question: string, options: AskOptions): Promise<AskResult> {
  const root = requireKbRoot()
  const paths = kbPaths(root)

  const { index, context, contextBatches, allArticles, rankedInfo } = await buildAskContext(question, options.tag, options.maxContext, options.entity)
  options.onContextBuilt?.()

  let rawAnswer: string

  // Check if single-batch mode would overflow (includes truncated index + context + system + question + response)
  const singleBatchPrompt = buildMdUserPrompt(question, index, context)
  const singleBatchTotal = estimateTokens(MD_SYSTEM) + estimateTokens(singleBatchPrompt) + 8192
  const useMultiBatch = contextBatches.length > 1 || singleBatchTotal > (MODEL_MAX_TOKENS - SINGLE_BATCH_SAFETY_MARGIN)

  if (!useMultiBatch) {
    // Single batch fits safely — stream directly
    let firstChunk = true
    const onChunk = (text: string) => {
      if (firstChunk) {
        firstChunk = false
        options.onFirstAnswerChunk?.()
      }
      options.onChunk(text)
    }

    rawAnswer = await llmStream(
      singleBatchPrompt,
      { system: MD_SYSTEM, maxTokens: 8192, action: 'ask' },
      onChunk,
    )
  } else {
    // Multi-batch: extract facts from each batch, then synthesize
    const extractedFacts: string[] = []

    for (let i = 0; i < contextBatches.length; i++) {
      const batchPrompt = buildBatchExtractPrompt(question, contextBatches[i])
      const batchResult = await llm(batchPrompt, {
        system: BATCH_EXTRACT_SYSTEM,
        maxTokens: 4096,
        action: 'ask',
        meta: `batch-extract-${i + 1}/${contextBatches.length}`,
      })
      extractedFacts.push(batchResult)
    }

    // Truncate extracted facts if synthesis would overflow
    let factsText = extractedFacts.join('\n\n')
    const synthesisOverhead = estimateTokens(SYNTHESIZE_SYSTEM) + estimateTokens(question) + 1000 + 8192
    const factsBudget = MODEL_MAX_TOKENS - SINGLE_BATCH_SAFETY_MARGIN - synthesisOverhead
    if (estimateTokens(factsText) > factsBudget) {
      const maxChars = factsBudget * CHARS_PER_TOKEN
      factsText = factsText.slice(0, maxChars) + '\n\n[Extracted facts truncated due to length]'
    }

    // Stream final synthesis
    let firstChunk = true
    const onChunk = (text: string) => {
      if (firstChunk) {
        firstChunk = false
        options.onFirstAnswerChunk?.()
      }
      options.onChunk(text)
    }

    rawAnswer = await llmStream(
      buildSynthesizePrompt(question, extractedFacts),
      { system: SYNTHESIZE_SYSTEM, maxTokens: 8192, action: 'ask' },
      onChunk,
    )
  }

  if (options.file === false) {
    return { rawAnswer, filedPath: null, rankedInfo }
  }

  const slug = slugifyShort(question)
  const timestamp = new Date().toISOString()
  const safeTitle = question.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')

  // Extract wiki links from the answer and aggregate metadata
  const { citedSources, relatedConcepts, tags, entities } = extractAnswerMetadata(
    rawAnswer,
    allArticles,
    paths,
  )

  // Build rich frontmatter
  const frontmatter: Record<string, unknown> = {
    title: safeTitle,
    type: 'query',
    date: timestamp,
  }

  if (citedSources.length > 0) {
    frontmatter.cited_sources = citedSources.map(s => `[[${s}]]`)
  }
  if (relatedConcepts.length > 0) {
    frontmatter.related_concepts = relatedConcepts.map(c => `[[${c}]]`)
  }
  if (tags.length > 0) {
    frontmatter.tags = tags
  }
  if (Object.keys(entities).length > 0) {
    frontmatter.entities = entities
  }

  const body = `# ${question.replace(/[\r\n]+/g, ' ')}

${normalizeLinks(rawAnswer, allArticles)}

---
*Query filed on ${timestamp}*
`

  mkdirSync(paths.output, { recursive: true })
  const outputPath = join(paths.output, `${slug}.md`)
  writeFileSync(outputPath, matter.stringify(body, frontmatter))

  return { rawAnswer, filedPath: outputPath, rankedInfo }
}

/**
 * Count occurrences of a pattern in text (case-insensitive).
 */
function countOccurrences(text: string, pattern: RegExp): number {
  const matches = text.match(new RegExp(pattern, 'gi'))
  return matches ? matches.length : 0
}

/**
 * Extract metadata from answer content by parsing wiki links and aggregating
 * tags/entities from cited sources and concepts.
 *
 * Tags and entities are filtered to only include those actually mentioned in the
 * answer content, not all tags/entities from cited sources.
 */
function extractAnswerMetadata(
  answer: string,
  allArticles: WikiArticle[],
  paths: { wikiSources: string; wikiConcepts: string },
): {
  citedSources: string[]
  relatedConcepts: string[]
  tags: string[]
  entities: Record<string, string[]>
} {
  const citedSources: string[] = []
  const relatedConcepts: string[] = []
  const tagSet = new Set<string>()
  const entityMap: Record<string, string[]> = {}

  // Extract all [[wiki-links]] from the answer
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  const links = [...answer.matchAll(wikiLinkRegex)].map((m) => m[1])

  // Build lookup maps for sources and concepts
  const sourceSlugs = new Set(
    allArticles
      .filter((a) => a.path.startsWith(paths.wikiSources))
      .map((a) => basename(a.path, '.md')),
  )
  const conceptSlugs = new Set(
    allArticles
      .filter((a) => a.path.startsWith(paths.wikiConcepts))
      .map((a) => basename(a.path, '.md')),
  )

  // Prepare answer text for content-based filtering (lowercase for matching)
  const answerLower = answer.toLowerCase()

  // Categorize links and aggregate metadata
  for (const link of links) {
    // Extract slug from link (handle paths like "sources/foo" or just "foo")
    const slug = link.includes('/') ? basename(link) : link
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-')

    if (sourceSlugs.has(normalizedSlug)) {
      if (!citedSources.includes(normalizedSlug)) {
        citedSources.push(normalizedSlug)

        // Aggregate tags and entities from this source, but only if they're
        // actually mentioned in the answer content with sufficient frequency,
        // OR if they appear in the original question (query subject)
        const sourceArticle = allArticles.find(
          (a) =>
            a.path.startsWith(paths.wikiSources) &&
            basename(a.path, '.md').toLowerCase().replace(/\s+/g, '-') === normalizedSlug,
        )
        if (sourceArticle) {
          // Only add tags that appear in the answer content
          for (const tag of sourceArticle.tags) {
            const normalizedTagValue = normalizeTag(tag)
            // Check if tag appears in answer with word boundaries
            const tagPattern = new RegExp(
              `\b${normalizedTagValue.replace(/-/g, '[-\s]')}\b`,
              'i'
            )
            if (tagPattern.test(answerLower)) {
              tagSet.add(normalizedTagValue)
            }
          }

          // Only add entities that appear in the answer content
          if (sourceArticle.entities) {
            for (const [category, names] of Object.entries(sourceArticle.entities)) {
              for (const name of names) {
                // Check if entity name appears in answer with word boundaries
                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const namePattern = new RegExp(`\b${escapedName}\b`, 'i')
                if (namePattern.test(answerLower)) {
                  if (!entityMap[category]) entityMap[category] = []
                  if (!entityMap[category].includes(name)) {
                    entityMap[category].push(name)
                  }
                }
              }
            }
          }
        }
      }
    } else if (conceptSlugs.has(normalizedSlug)) {
      if (!relatedConcepts.includes(normalizedSlug)) {
        relatedConcepts.push(normalizedSlug)
      }
    }
  }

  return {
    citedSources,
    relatedConcepts,
    tags: Array.from(tagSet).sort(),
    entities: entityMap,
  }
}
