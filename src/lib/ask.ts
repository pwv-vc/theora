import { writeFileSync, mkdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import matter from 'gray-matter'
import { kbPaths, requireKbRoot } from './paths.js'
import { llmStream } from './llm.js'
import { listWikiArticles, readWikiIndex, normalizeLinks, readWikiArticle, type WikiArticle } from './wiki.js'
import { findRelevantArticles, buildContext } from './query.js'
import { slugifyShort, normalizeTag } from './utils.js'
import { MD_SYSTEM, buildMdUserPrompt } from './prompts/index.js'

export interface AskOptions {
  tag?: string
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
}

export interface AskResult {
  rawAnswer: string
  filedPath: string | null
  rankedInfo?: RankedContextInfo
}

export interface AskContext {
  index: string
  context: string
  allArticles: ReturnType<typeof listWikiArticles>
  rankedInfo?: RankedContextInfo
}

export async function buildAskContext(question: string, tag?: string, maxContext?: number): Promise<AskContext> {
  const root = requireKbRoot()
  const paths = kbPaths(root)

  const index = readWikiIndex()
  const allArticles = listWikiArticles()

  const outputArticles = allArticles.filter(a => a.path.startsWith(paths.output))
  let wikiArticles = allArticles.filter(a => a.path.startsWith(paths.wiki))

  if (tag) {
    wikiArticles = wikiArticles.filter(a =>
      a.tags.some(t => t.toLowerCase() === tag.toLowerCase()),
    )
  }

  const rankingResult = await findRelevantArticles(question, index, wikiArticles, maxContext)
  const relevant = rankingResult.articles
  const context = buildContext([...relevant, ...outputArticles])

  const rankedInfo: RankedContextInfo = {
    wikiArticles: rankingResult.articles.map(a => ({ title: a.title, path: a.relativePath, rank: a.rank })),
    outputArticles: outputArticles.map(a => ({ title: a.title, path: a.relativePath })),
    totalWikiConsidered: rankingResult.totalConsidered,
    tagFilter: tag,
  }

  return { index, context, allArticles, rankedInfo }
}

export async function streamAsk(question: string, options: AskOptions): Promise<AskResult> {
  const root = requireKbRoot()
  const paths = kbPaths(root)

  const { index, context, allArticles, rankedInfo } = await buildAskContext(question, options.tag, options.maxContext)
  options.onContextBuilt?.()

  let firstChunk = true
  const onChunk = (text: string) => {
    if (firstChunk) {
      firstChunk = false
      options.onFirstAnswerChunk?.()
    }
    options.onChunk(text)
  }

  const rawAnswer = await llmStream(
    buildMdUserPrompt(question, index, context),
    { system: MD_SYSTEM, maxTokens: 8192, action: 'ask' },
    onChunk,
  )

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
 * Extract metadata from answer content by parsing wiki links and aggregating
 * tags/entities from cited sources and concepts.
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

  // Categorize links and aggregate metadata
  for (const link of links) {
    // Extract slug from link (handle paths like "sources/foo" or just "foo")
    const slug = link.includes('/') ? basename(link) : link
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-')

    if (sourceSlugs.has(normalizedSlug)) {
      if (!citedSources.includes(normalizedSlug)) {
        citedSources.push(normalizedSlug)

        // Aggregate tags and entities from this source
        const sourceArticle = allArticles.find(
          (a) =>
            a.path.startsWith(paths.wikiSources) &&
            basename(a.path, '.md').toLowerCase().replace(/\s+/g, '-') === normalizedSlug,
        )
        if (sourceArticle) {
          for (const tag of sourceArticle.tags) {
            tagSet.add(normalizeTag(tag))
          }
          if (sourceArticle.entities) {
            for (const [category, names] of Object.entries(sourceArticle.entities)) {
              if (!entityMap[category]) entityMap[category] = []
              for (const name of names) {
                if (!entityMap[category].includes(name)) {
                  entityMap[category].push(name)
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
