import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, basename, extname } from 'node:path'
import matter from 'gray-matter'
import { kbPaths, requireKbRoot } from './paths.js'

// --- Types ---

export interface WikiArticle {
  path: string
  relativePath: string
  title: string
  content: string
  tags: string[]
  frontmatter: Record<string, unknown>
}

// Ontology types aligned with schema.org (https://schema.org) and Wikidata equivalents.
// Each maps to a canonical schema.org type for interoperability.
export const ONTOLOGY_TYPES = [
  'person',        // schema.org/Person       — Wikidata Q215627
  'organization',  // schema.org/Organization — Wikidata Q43229 (companies, NGOs, institutions)
  'place',         // schema.org/Place        — Wikidata Q2221906
  'product',       // schema.org/Product      — Wikidata Q2424752
  'event',         // schema.org/Event        — Wikidata Q1656682
  'creative-work', // schema.org/CreativeWork — Wikidata Q17537576 (papers, books, articles)
  'technology',    // schema.org/SoftwareApplication / TechArticle
  'concept',       // abstract idea — no direct schema.org equivalent; fallback
] as const
export type OntologyType = typeof ONTOLOGY_TYPES[number]

export const ONTOLOGY_SCHEMA_URLS: Record<OntologyType, string> = {
  'person':        'https://schema.org/Person',
  'organization':  'https://schema.org/Organization',
  'place':         'https://schema.org/Place',
  'product':       'https://schema.org/Product',
  'event':         'https://schema.org/Event',
  'creative-work': 'https://schema.org/CreativeWork',
  'technology':    'https://schema.org/SoftwareApplication',
  'concept':       'https://schema.org/Thing',
}

export interface ArticleMeta {
  title: string
  type: 'source' | 'concept'
  ontology?: OntologyType[]
  sourceFile?: string
  sourceType?: 'text' | 'pdf' | 'image'
  tags: string[]
  relatedSources?: string[]
}

// --- LLM Output Sanitization ---

export function sanitizeLlmOutput(raw: string): { body: string; tags: string[] } {
  let text = raw.trim()

  // Strip outer markdown code fence wrapper (preserves inner fences like ```mermaid)
  const mdFenceMatch = text.match(/^```(?:markdown|md)\s*\n([\s\S]*)\n```\s*$/)
  if (mdFenceMatch) {
    text = mdFenceMatch[1].trim()
  }

  // Strip any YAML frontmatter the LLM added despite instructions
  if (text.startsWith('---')) {
    const endIdx = text.indexOf('---', 3)
    if (endIdx !== -1) {
      text = text.slice(endIdx + 3).trim()
    }
  }

  // Extract tags from last line if present
  const lines = text.split('\n')
  let tags: string[] = []
  const lastLine = lines[lines.length - 1]?.trim() ?? ''
  if (lastLine.toLowerCase().startsWith('tags:')) {
    const tagStr = lastLine.slice(5).trim()
    tags = tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    lines.pop()
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  }

  return { body: lines.join('\n').trim(), tags }
}

// --- Article Writing ---

export function writeArticle(destPath: string, meta: ArticleMeta, body: string): void {
  mkdirSync(join(destPath, '..'), { recursive: true })

  const frontmatter: Record<string, unknown> = {
    title: meta.title,
    type: meta.type,
    date_compiled: new Date().toISOString().split('T')[0],
    tags: meta.tags,
  }

  if (meta.ontology?.length) {
    frontmatter.ontology = meta.ontology.map(o => `[[${o}]]`)
    frontmatter.schema_url = meta.ontology.map(o => ONTOLOGY_SCHEMA_URLS[o])
  }
  if (meta.sourceFile) frontmatter.source_file = meta.sourceFile
  if (meta.sourceType) frontmatter.source_type = meta.sourceType
  if (meta.relatedSources?.length) frontmatter.related_sources = meta.relatedSources.map(s => `[[${s}]]`)

  let finalBody = body
  if (meta.type === 'concept' && meta.relatedSources?.length) {
    const links = meta.relatedSources.map(s => `- [[${s}]]`).join('\n')
    finalBody = finalBody.trimEnd() + '\n\n## Related Sources\n\n' + links + '\n'
  }

  writeFileSync(destPath, matter.stringify('\n' + finalBody + '\n', frontmatter))
}

// --- Reading ---

export function readWikiArticle(filePath: string): WikiArticle {
  const root = requireKbRoot()
  const raw = readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const title = data.title ?? basename(filePath, extname(filePath)).replace(/-/g, ' ')
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : []

  return {
    path: filePath,
    relativePath: relative(root, filePath),
    title,
    content,
    tags,
    frontmatter: data,
  }
}

export function listWikiArticles(): WikiArticle[] {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const articles: WikiArticle[] = []

  function walk(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) articles.push(readWikiArticle(full))
    }
  }

  walk(paths.wiki)
  walk(paths.output)
  return articles
}

export function readWikiIndex(): string {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  if (!existsSync(paths.wikiIndex)) return ''
  return readFileSync(paths.wikiIndex, 'utf-8')
}

// --- Tags ---

export function getAllTags(): string[] {
  const tagSet = new Set<string>()
  for (const article of listWikiArticles()) {
    for (const tag of article.tags) tagSet.add(tag)
  }
  return [...tagSet].sort()
}

export interface TagWithCount {
  tag: string
  count: number
}

export function getAllTagsWithCounts(): TagWithCount[] {
  const counts = new Map<string, number>()
  for (const article of listWikiArticles()) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

// --- Raw Files ---

export function listRawFiles(): string[] {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const files: string[] = []

  function walk(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else files.push(full)
    }
  }

  walk(paths.raw)
  return files
}

// --- Stats ---

export function getWikiStats(): { articles: number; words: number; sources: number; concepts: number } {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const articles = listWikiArticles()
  let words = 0, sources = 0, concepts = 0

  for (const article of articles) {
    words += article.content.split(/\s+/).length
    if (article.path.startsWith(paths.wikiSources)) sources++
    if (article.path.startsWith(paths.wikiConcepts)) concepts++
  }

  return { articles: articles.length, words, sources, concepts }
}

// --- Lint Helpers ---

export function fixBrokenLinks(filePath: string, validSlugs: Set<string>): number {
  const raw = readFileSync(filePath, 'utf-8')
  let fixed = 0
  const updated = raw.replace(/\[\[([^\]]+)\]\]/g, (match, linkText: string) => {
    const slug = linkText.toLowerCase().replace(/\s+/g, '-')
    if (validSlugs.has(slug)) {
      if (slug !== linkText) {
        fixed++
        return `[[${slug}]]`
      }
      return match
    }
    fixed++
    return `**${linkText}**`
  })
  if (fixed > 0) writeFileSync(filePath, updated)
  return fixed
}

export function normalizeLinks(text: string, articles: WikiArticle[]): string {
  const bySlug = new Map(articles.map(a => [basename(a.path, '.md'), a]))

  return text.replace(/\[\[([^\]]+)\]\]/g, (match, linkText: string) => {
    const slug = linkText.toLowerCase().replace(/\s+/g, '-')
    const article = bySlug.get(slug)
    if (article) return `[${article.title}](${article.relativePath})`
    return `**${linkText}**`
  })
}
