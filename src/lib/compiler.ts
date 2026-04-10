import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename, extname, relative } from 'node:path'
import ora from 'ora'
import pLimit from 'p-limit'
import pc from 'picocolors'
import { normalizeLinks } from './wiki.js'
import { PDFParse } from 'pdf-parse'
import { kbPaths } from './paths.js'
import { llm, llmVision } from './llm.js'
import type { ImageInput } from './llm.js'
import { listRawFiles, listWikiArticles, writeArticle, sanitizeLlmOutput, readWikiIndex, getWikiStats, ONTOLOGY_TYPES, ONTOLOGY_SCHEMA_URLS } from './wiki.js'
import type { ArticleMeta, OntologyType } from './wiki.js'
import { getTagForFile } from './manifest.js'
import { slugify, titleFromFilename, normalizeTag } from './utils.js'
import { readConfig } from './config.js'
import {
  COMPILE_SYSTEM,
  buildSourcePrompt,
  buildPdfPrompt,
  buildImagePrompt,
} from './prompts/compile.js'
import { CONCEPT_SYSTEM, buildConceptPrompt } from './prompts/concept.js'

// --- File classification ---

const TEXT_EXTS = new Set(['.md', '.mdx', '.txt', '.html', '.json', '.csv', '.xml', '.yaml', '.yml'])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const PDF_EXTS = new Set(['.pdf'])

type FileKind = 'text' | 'image' | 'pdf' | 'unknown'

function classifyFile(path: string): FileKind {
  const ext = extname(path).toLowerCase()
  if (TEXT_EXTS.has(ext)) return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (PDF_EXTS.has(ext)) return 'pdf'
  return 'unknown'
}

const MEDIA_TYPES: Record<string, ImageInput['mediaType']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

function mergeTags(ingestTag: string | null, llmTags: string[]): string[] {
  const set = new Set(llmTags.map(t => normalizeTag(t)))
  if (ingestTag) set.add(normalizeTag(ingestTag))
  return [...set].sort()
}

function getExistingSourceSlugs(root: string): Set<string> {
  const paths = kbPaths(root)
  return new Set(
    listWikiArticles()
      .filter(a => a.path.startsWith(paths.wikiSources))
      .map(a => basename(a.path, '.md')),
  )
}

// --- File compilers ---

async function compileTextFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)

  const content = readFileSync(file, 'utf-8').slice(0, 50000)
  const ext = extname(file).toLowerCase().slice(1)
  const raw = await llm(buildSourcePrompt(basename(file), content, ingestTag), { system: COMPILE_SYSTEM, maxTokens: 4096, action: 'compile', meta: ext })
  const { body, tags } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'text',
    tags: mergeTags(ingestTag, tags),
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

async function compilePdfFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)

  const buffer = readFileSync(file)
  let text: string
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text
    parser.destroy()
  } catch {
    return
  }

  const raw = await llm(buildPdfPrompt(basename(file), text.slice(0, 50000), ingestTag), { system: COMPILE_SYSTEM, maxTokens: 4096, action: 'compile', meta: 'pdf' })
  const { body, tags } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'pdf',
    tags: mergeTags(ingestTag, tags),
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

async function compileImageFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)
  const ext = extname(file).toLowerCase()

  const mediaType = MEDIA_TYPES[ext]
  if (!mediaType) return

  const base64 = readFileSync(file).toString('base64')
  const imageRef = `![${name}](${relative(join(paths.root, 'wiki', 'sources'), file)})`

  const raw = await llmVision(
    buildImagePrompt(basename(file), imageRef, ingestTag),
    [{ base64, mediaType }],
    { system: 'You are a knowledge base compiler analyzing images. Describe what you see in detail and extract all useful information.', maxTokens: 4096, action: 'vision' },
  )
  const { body, tags } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'image',
    tags: mergeTags(ingestTag, tags),
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

// --- Pipeline stages ---

export async function compileSources(root: string, concurrency?: number, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const rawFiles = listRawFiles()
  const existingSlugs = getExistingSourceSlugs(root)

  const newFiles = rawFiles.filter(f => {
    const kind = classifyFile(f)
    if (kind === 'unknown') return false
    return !existingSlugs.has(slugify(basename(f, extname(f))))
  })

  if (newFiles.length === 0) {
    console.log('All sources already compiled. Nothing new to process.')
    return
  }

  const byKind = { text: 0, image: 0, pdf: 0 }
  for (const f of newFiles) {
    const kind = classifyFile(f)
    if (kind !== 'unknown') byKind[kind]++
  }

  const parts = []
  if (byKind.text > 0) parts.push(`${byKind.text} text`)
  if (byKind.pdf > 0) parts.push(`${byKind.pdf} PDF`)
  if (byKind.image > 0) parts.push(`${byKind.image} image`)
  console.log(`Found ${newFiles.length} new source${newFiles.length !== 1 ? 's' : ''} to compile (${parts.join(', ')})`)

  const { compileConcurrency } = readConfig()
  const limit = pLimit(concurrency ?? compileConcurrency)

  let done = 0
  const inFlight = new Set<string>()
  const spinner = onProgress ? null : ora(`Compiling sources [0/${newFiles.length}]`).start()

  const updateSpinner = () => {
    if (onProgress) {
      const files = [...inFlight].join(', ')
      onProgress(`Compiling sources [${done}/${newFiles.length}]${files ? ` → ${files}` : ''}`)
    } else if (spinner) {
      const files = [...inFlight].map(f => pc.cyan(f)).join(pc.gray(', '))
      spinner.text = `Compiling sources [${done}/${newFiles.length}]\n  ${pc.gray('→')} ${files}`
    }
  }

  await Promise.all(
    newFiles.map(file =>
      limit(async () => {
        const name = basename(file)
        inFlight.add(name)
        updateSpinner()

        const ingestTag = getTagForFile(name)
        switch (classifyFile(file)) {
          case 'text': await compileTextFile(file, paths, ingestTag); break
          case 'pdf': await compilePdfFile(file, paths, ingestTag); break
          case 'image': await compileImageFile(file, paths, ingestTag); break
        }

        inFlight.delete(name)
        done++
        updateSpinner()
      })
    )
  )

  if (spinner) {
    spinner.succeed(`Compiled ${newFiles.length} source${newFiles.length !== 1 ? 's' : ''}`)
  } else {
    onProgress?.(`✓ Compiled ${newFiles.length} source${newFiles.length !== 1 ? 's' : ''}`)
  }
}

export async function extractConcepts(root: string, concurrency?: number, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const sourceArticles = listWikiArticles().filter(a => a.path.startsWith(paths.wikiSources))
  if (sourceArticles.length === 0) return

  const spinner = onProgress ? null : ora('Extracting concepts').start()
  onProgress?.('Extracting concepts...')

  const { compileConcurrency: defaultConcurrency, conceptSummaryChars, conceptMin, conceptMax } = readConfig()

  const summaries = sourceArticles
    .map(a => `### ${a.title}\n${a.content.slice(0, conceptSummaryChars)}`)
    .join('\n\n')

  const conceptsRaw = await llm(
    `Review these wiki source summaries and identify the key concepts that deserve their own articles.

${summaries}

Return a JSON array of objects with:
- "slug": kebab-case filename
- "title": human-readable title
- "description": one-sentence description
- "related_sources": array of source slugs that mention this concept
- "ontology": array of schema.org-aligned types that apply to this concept — pick one or more:
${ONTOLOGY_TYPES.map(t => `  "${t}" (${ONTOLOGY_SCHEMA_URLS[t as OntologyType]})`).join('\n')}
  A concept can have multiple types (e.g. a person who is also an author: ["person", "creative-work"])

Only return the JSON array, no other text. Identify ${conceptMin}-${conceptMax} of the most important concepts.`,
    { system: 'You are a knowledge base organizer. Extract key concepts from source summaries. Return valid JSON only.', maxTokens: 4096, action: 'concepts' },
  )

  let concepts: Array<{ slug: string; title: string; description: string; related_sources: string[]; ontology?: string[] }>
  try {
    concepts = JSON.parse(conceptsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    if (spinner) spinner.warn('Could not parse concepts. Skipping concept generation.')
    else onProgress?.('⚠ Could not parse concepts. Skipping concept generation.')
    return
  }

  if (spinner) spinner.succeed(`Found ${concepts.length} concepts`)
  else onProgress?.(`Found ${concepts.length} concepts`)

  const existingConcepts = listWikiArticles()
    .filter(a => a.path.startsWith(paths.wikiConcepts))
    .map(a => basename(a.path, '.md'))

  const newConcepts = concepts.filter(c => !existingConcepts.includes(slugify(c.slug)))

  if (newConcepts.length === 0) return

  const validTargets = [
    ...existingConcepts,
    ...newConcepts.map(c => c.slug),
    ...sourceArticles.map(a => basename(a.path, '.md')),
  ].join(', ')

  const limit = pLimit(concurrency ?? defaultConcurrency)

  let done = 0
  const inFlight = new Set<string>()
  const conceptSpinner = onProgress ? null : ora(`Writing concepts [0/${newConcepts.length}]`).start()

  const updateConceptSpinner = () => {
    if (onProgress) {
      const titles = [...inFlight].join(', ')
      onProgress(`Writing concepts [${done}/${newConcepts.length}]${titles ? ` → ${titles}` : ''}`)
    } else if (conceptSpinner) {
      const titles = [...inFlight].map(t => pc.cyan(t)).join(pc.gray(', '))
      conceptSpinner.text = `Writing concepts [${done}/${newConcepts.length}]\n  ${pc.gray('→')} ${titles}`
    }
  }

  await Promise.all(
    newConcepts.map(concept =>
      limit(async () => {
        inFlight.add(concept.title)
        updateConceptSpinner()

        const relatedContent = sourceArticles
          .filter(a => concept.related_sources.some(s => a.path.includes(s)))
          .map(a => `### ${a.title}\n${a.content.slice(0, 3000)}`)
          .join('\n\n')

        const raw = await llm(
          buildConceptPrompt(concept.title, concept.description, relatedContent, validTargets),
          { system: CONCEPT_SYSTEM, maxTokens: 4096, action: 'concepts' },
        )
        const { body, tags } = sanitizeLlmOutput(raw)

        const ontology = Array.isArray(concept.ontology)
          ? concept.ontology.filter((o): o is OntologyType => ONTOLOGY_TYPES.includes(o as OntologyType))
          : ['concept' as OntologyType]

        const meta: ArticleMeta = {
          title: concept.title,
          type: 'concept',
          ontology: ontology.length ? ontology : ['concept'],
          tags,
          relatedSources: concept.related_sources,
        }

        const safeSlug = slugify(concept.slug)
        if (!safeSlug) return
        writeArticle(join(paths.wikiConcepts, `${safeSlug}.md`), meta, body)
        inFlight.delete(concept.title)
        done++
        updateConceptSpinner()
      })
    )
  )

  if (conceptSpinner) {
    conceptSpinner.succeed(`Wrote ${newConcepts.length} concept${newConcepts.length !== 1 ? 's' : ''}`)
  } else {
    onProgress?.(`✓ Wrote ${newConcepts.length} concept${newConcepts.length !== 1 ? 's' : ''}`)
  }
}

export async function rebuildIndex(root: string, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const spinner = onProgress ? null : ora('Rebuilding index').start()
  onProgress?.('Rebuilding index...')

  const articles = listWikiArticles()
  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const queries = articles.filter(a => a.path.startsWith(paths.output))

  const toObsidianTag = (tag: string) => `#${tag.toLowerCase().replace(/\s+/g, '-')}`

  const articleLink = (a: (typeof articles)[0]) => {
    const tagStr = a.tags.length > 0 ? `  ${a.tags.map(toObsidianTag).join(' ')}` : ''
    return `- [${a.title}](${relative(paths.wiki, a.path)})${tagStr}`
  }

  const tagMap = new Map<string, typeof articles>()
  for (const article of articles) {
    for (const tag of article.tags) {
      const list = tagMap.get(tag) ?? []
      list.push(article)
      tagMap.set(tag, list)
    }
  }

  const tagSection = tagMap.size > 0
    ? [...tagMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, tagged]) => {
          const links = tagged.map(a => `[${a.title}](${relative(paths.wiki, a.path)})`).join(', ')
          return `- ${toObsidianTag(tag)}: ${links}`
        })
        .join('\n')
    : ''

  let briefSummary = ''
  if (articles.length > 0) {
    const allContent = articles.map(a => `${a.title}: ${a.content.slice(0, 500)}`).join('\n')
    const rawSummary = await llm(
      `Write a 2-3 sentence summary of this knowledge base based on its articles:\n\n${allContent.slice(0, 10000)}`,
      { system: 'Write a brief, informative summary. No markdown formatting, just plain text.', maxTokens: 256, action: 'compile' },
    )
    briefSummary = normalizeLinks(rawSummary, articles)
  }

  const stats = getWikiStats()

  const index = `# Knowledge Base Index

> Auto-maintained by \`theora compile\`. Last updated: ${new Date().toISOString()}

${briefSummary ? `## Overview\n\n${briefSummary}\n` : ''}
## Sources (${sources.length})

${sources.map(articleLink).join('\n') || '_No sources compiled yet._'}

## Concepts (${concepts.length})

${concepts.map(articleLink).join('\n') || '_No concepts extracted yet._'}
${queries.length > 0 ? `\n## Previous Queries (${queries.length})\n\n${queries.map(articleLink).join('\n')}\n` : ''}${tagSection ? `\n## Tags (${tagMap.size})\n\n${tagSection}\n` : ''}
## Stats

- **Articles**: ${stats.articles}
- **Words**: ~${stats.words.toLocaleString()}
`

  writeFileSync(paths.wikiIndex, index)
  if (spinner) spinner.succeed('Index rebuilt')
  else onProgress?.('✓ Index rebuilt')
}

