import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, basename, extname } from 'node:path'
import matter from 'gray-matter'
import { kbPaths, requireKbRoot } from './paths.js'
import { normalizeTag, slugify } from './utils.js'

// --- Types ---

export interface WikiArticle {
  path: string
  relativePath: string
  title: string
  content: string
  tags: string[]
  frontmatter: Record<string, unknown>
  entities?: Record<string, string[]>
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
  sourceUrl?: string
  sourcePublishedDate?: string
  sourceVideoId?: string
  sourceChannelId?: string
  sourceThumbnailUrl?: string
  sourceType?: 'text' | 'pdf' | 'image' | 'audio' | 'video'
  tags: string[]
  relatedSources?: string[]
  entities?: Record<string, string[]>
}

// --- LLM Output Sanitization ---

export function sanitizeLlmOutput(raw: string): { body: string; tags: string[]; entities?: Record<string, string[]> } {
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

  // Scan backward through the last few lines for Tags: and Entities: markers.
  // LLMs may insert blank lines between them or reverse their order.
  const lines = text.split('\n')
  let tags: string[] = []
  let entities: Record<string, string[]> = {}
  let tagsIdx = -1
  let entitiesIdx = -1
  const scanFloor = Math.max(0, lines.length - 6)

  for (let i = lines.length - 1; i >= scanFloor; i--) {
    const trimmed = lines[i].trim().toLowerCase()
    if (trimmed.startsWith('tags:') && tagsIdx === -1) tagsIdx = i
    if (trimmed.startsWith('entities:') && entitiesIdx === -1) entitiesIdx = i
  }

  if (entitiesIdx !== -1) {
    try {
      const raw_line = lines[entitiesIdx].trim()
      const jsonStr = raw_line.slice(raw_line.indexOf(':') + 1).trim()
      const parsed = JSON.parse(jsonStr)
      if (parsed && typeof parsed === 'object') {
        entities = parsed
      }
    } catch {
      // Ignore parse errors — entities will be empty
    }
  }

  if (tagsIdx !== -1) {
    const tagStr = lines[tagsIdx].trim().slice(5).trim()
    tags = tagStr.split(',').map(t => normalizeTag(t)).filter(Boolean)
  }

  // Remove both marker lines (higher index first to preserve indices)
  const removeIndices = [tagsIdx, entitiesIdx].filter(i => i !== -1).sort((a, b) => b - a)
  for (const idx of removeIndices) lines.splice(idx, 1)

  // Trim trailing blank lines left behind by removal
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

  return { body: lines.join('\n').trim(), tags, entities }
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
    frontmatter.ontology = [...meta.ontology]
    frontmatter.schema_url = meta.ontology.map(o => ONTOLOGY_SCHEMA_URLS[o])
  }
  if (meta.sourceFile) frontmatter.source_file = meta.sourceFile
  if (meta.sourceUrl) frontmatter.source_url = meta.sourceUrl
  if (meta.sourcePublishedDate) frontmatter.source_published_date = meta.sourcePublishedDate
  if (meta.sourceVideoId) frontmatter.source_video_id = meta.sourceVideoId
  if (meta.sourceChannelId) frontmatter.source_channel_id = meta.sourceChannelId
  if (meta.sourceThumbnailUrl) frontmatter.source_thumbnail_url = meta.sourceThumbnailUrl
  if (meta.sourceType) frontmatter.source_type = meta.sourceType
  if (meta.relatedSources?.length) frontmatter.related_sources = meta.relatedSources.map(s => `[[${s}]]`)
  if (meta.entities && Object.keys(meta.entities).length > 0) {
    const slugifiedEntities: Record<string, string[]> = {}
    for (const [category, names] of Object.entries(meta.entities)) {
      slugifiedEntities[category] = names.map(name => slugify(name))
    }
    frontmatter.entities = slugifiedEntities
  }

  let finalBody = body
  if (meta.type === 'source' && meta.sourceUrl) {
    finalBody = finalBody.trimEnd() + `\n\n---\n\n**Original URL:** ${meta.sourceUrl}\n`
  }
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
  const entities = data.entities && typeof data.entities === 'object' ? data.entities as Record<string, string[]> : undefined

  return {
    path: filePath,
    relativePath: relative(root, filePath),
    title,
    content,
    tags,
    frontmatter: data,
    entities,
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
    // Extract just the filename part if the link includes a path (e.g., "sources/concerts" -> "concerts")
    const filename = linkText.includes('/') ? linkText.split('/').pop()! : linkText
    const slug = filename.toLowerCase().replace(/\s+/g, '-')
    const article = bySlug.get(slug)
    if (article) return `[${article.title}](${article.relativePath})`
    return `**${linkText}**`
  })
}

/** Encode each path segment for `/raw/...` URLs (spaces, unicode filenames). */
export function encodeRawUrlPath(path: string): string {
  return path
    .split('/')
    .map(seg => (seg ? encodeURIComponent(seg) : ''))
    .join('/')
}

/** Wiki markdown uses `../../raw/...` from `wiki/sources/`; web URLs are `/raw/<path-under-raw>`. */
function pathUnderRawFromRelativeMarkdown(relPath: string): string {
  return relPath.replace(/^(?:\.\.\/)+raw\//, '')
}

const WEB_WIKI_ARTICLE_PATH =
  /^(?:\/)?(?:output\/)?wiki\/(sources|concepts)\/([^/?#]+)$/i

/**
 * LLMs often emit markdown links like `/output/wiki/sources/foo.md` or `wiki/concepts/bar.md`
 * instead of [[wiki-links]]. Web routes are `/wiki/sources|concepts/<slug>` with no `.md`.
 */
export function repairWikiArticleMarkdownHrefsForWeb(text: string): string {
  return text.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (match, label: string, href: string) => {
    const trimmed = href.trim()
    if (/^(?:https?:)?\/\//i.test(trimmed)) return match

    let suffix = ''
    const qIdx = trimmed.search(/[?#]/)
    let pathPart = trimmed
    if (qIdx !== -1) {
      pathPart = trimmed.slice(0, qIdx)
      suffix = trimmed.slice(qIdx)
    }

    let p = pathPart.replace(/\/+$/, '')
    if (p.startsWith('./')) p = p.slice(2)
    while (p.startsWith('../')) p = p.slice(3)

    const m = p.match(WEB_WIKI_ARTICLE_PATH)
    if (!m) return match

    const type = m[1].toLowerCase()
    let slug = m[2]
    if (slug.toLowerCase().endsWith('.md')) slug = slug.slice(0, -3)
    slug = slug.toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return match

    const fixed = `/wiki/${type}/${slug}${suffix}`
    return fixed === trimmed ? match : `[${label}](${fixed})`
  })
}

export function normalizeLinksForWeb(text: string, articles: WikiArticle[]): string {
  const bySlug = new Map(articles.map(a => [basename(a.path, '.md'), a]))

  let result = text.replace(/\[\[([^\]]+)\]\]/g, (match, linkText: string) => {
    // Extract just the filename part if the link includes a path (e.g., "sources/concerts" -> "concerts")
    const filename = linkText.includes('/') ? linkText.split('/').pop()! : linkText
    const slug = filename.toLowerCase().replace(/\s+/g, '-')
    const article = bySlug.get(slug)
    if (article) {
      const webPath = '/' + article.relativePath.replace(/\.md$/, '')
      return `[${article.title}](${webPath})`
    }
    return `**${linkText}**`
  })

  // Bracketed relative paths (required when path contains spaces for marked/Obsidian)
  result = result.replace(
    /!\[([^\]]*)\]\(<((?:\.\.\/)+raw\/[^>]+)>\)/g,
    (match, altText: string, rawPath: string) => {
      const underRaw = pathUnderRawFromRelativeMarkdown(rawPath)
      return `![${altText}](/raw/${encodeRawUrlPath(underRaw)})`
    },
  )

  // Unquoted relative ../../raw/... (including paths with spaces — old articles before angle brackets)
  result = result.replace(
    /!\[([^\]]*)\]\(((?:\.\.\/)+raw\/[^)]+)\)/g,
    (match, altText: string, rawPath: string) => {
      const underRaw = pathUnderRawFromRelativeMarkdown(rawPath)
      return `![${altText}](/raw/${encodeRawUrlPath(underRaw)})`
    },
  )

  // Repair /raw/... links that still contain unencoded spaces (e.g. old pipeline output)
  result = result.replace(/!\[([^\]]*)\]\(\/raw\/([^)]+)\)/g, (match, altText: string, rawPath: string) => {
    if (!/\s/.test(rawPath)) return match
    return `![${altText}](/raw/${encodeRawUrlPath(rawPath)})`
  })

  result = repairWikiArticleMarkdownHrefsForWeb(result)

  return result
}
