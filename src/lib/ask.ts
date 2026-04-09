import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { kbPaths, requireKbRoot } from './paths.js'
import { llmStream } from './llm.js'
import { listWikiArticles, readWikiIndex, normalizeLinks } from './wiki.js'
import { findRelevantArticles, buildContext } from './query.js'
import { slugifyShort } from './utils.js'
import { MD_SYSTEM, buildMdUserPrompt } from './prompts.js'

export interface AskOptions {
  tag?: string
  file?: boolean
  onChunk: (text: string) => void
}

export interface AskResult {
  rawAnswer: string
  filedPath: string | null
}

export interface AskContext {
  index: string
  context: string
  allArticles: ReturnType<typeof listWikiArticles>
}

export async function buildAskContext(question: string, tag?: string): Promise<AskContext> {
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

  const relevant = await findRelevantArticles(question, index, wikiArticles)
  const context = buildContext([...relevant, ...outputArticles])

  return { index, context, allArticles }
}

export async function streamAsk(question: string, options: AskOptions): Promise<AskResult> {
  const root = requireKbRoot()
  const paths = kbPaths(root)

  const { index, context, allArticles } = await buildAskContext(question, options.tag)

  const rawAnswer = await llmStream(
    buildMdUserPrompt(question, index, context),
    { system: MD_SYSTEM, maxTokens: 8192 },
    options.onChunk,
  )

  if (options.file === false) {
    return { rawAnswer, filedPath: null }
  }

  const slug = slugifyShort(question)
  const timestamp = new Date().toISOString()
  const filed = `---
title: "${question}"
type: query
date: ${timestamp}
---

# ${question}

${normalizeLinks(rawAnswer, allArticles)}

---
*Query filed on ${timestamp}*
`
  mkdirSync(paths.output, { recursive: true })
  const outputPath = join(paths.output, `${slug}.md`)
  writeFileSync(outputPath, filed)

  return { rawAnswer, filedPath: outputPath }
}
