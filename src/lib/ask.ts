import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { kbPaths, requireKbRoot } from './paths.js'
import { llmStream } from './llm.js'
import { listWikiArticles, readWikiIndex, normalizeLinks } from './wiki.js'
import { findRelevantArticles, buildContext } from './query.js'
import { slugifyShort } from './utils.js'
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
  const filed = `---
title: "${safeTitle}"
type: query
date: ${timestamp}
---

# ${question.replace(/[\r\n]+/g, ' ')}

${normalizeLinks(rawAnswer, allArticles)}

---
*Query filed on ${timestamp}*
`
  mkdirSync(paths.output, { recursive: true })
  const outputPath = join(paths.output, `${slug}.md`)
  writeFileSync(outputPath, filed)

  return { rawAnswer, filedPath: outputPath, rankedInfo }
}
