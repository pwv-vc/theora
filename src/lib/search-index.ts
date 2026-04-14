import { writeFileSync, readFileSync, existsSync, statSync } from 'node:fs'
import { kbPaths, safeJoin } from './paths.js'
import { listWikiArticles, type WikiArticle } from './wiki.js'
import { stemWord, tokenize } from './search-tokenize.js'

export const SEARCH_INDEX_SCHEMA_VERSION = 1 as const

export interface SearchIndexPosting {
  docId: number
  tfTitle: number
  tfBody: number
  tfTags: number
}

export interface SearchIndexDoc {
  docId: number
  relativePath: string
  title: string
  tags: string[]
  entities: string[]
  docType?: string
  /** Epoch ms — frontmatter date, else date_compiled, else file mtime. */
  docDateMs: number
  isOutput: boolean
  lenTitle: number
  lenBody: number
  lenTags: number
}

export interface SearchIndexFile {
  schemaVersion: typeof SEARCH_INDEX_SCHEMA_VERSION
  builtAt: string
  N: number
  avgdlTitle: number
  avgdlBody: number
  avgdlTags: number
  stemming: boolean
  docs: SearchIndexDoc[]
  postings: Record<string, SearchIndexPosting[]>
  dfTitle: Record<string, number>
  dfBody: Record<string, number>
  dfTags: Record<string, number>
  suggestVocab: string[]
}

function parseDocDateMs(frontmatter: Record<string, unknown>, filePath: string): number {
  const tryParse = (v: unknown): number | null => {
    if (v == null) return null
    if (typeof v !== 'string') return null
    const t = Date.parse(v)
    return Number.isNaN(t) ? null : t
  }
  return (
    tryParse(frontmatter.date) ??
    tryParse(frontmatter.date_compiled) ??
    statSync(filePath).mtimeMs
  )
}

function countStems(text: string, stemming: boolean): Map<string, number> {
  const m = new Map<string, number>()
  for (const w of tokenize(text)) {
    const s = stemWord(w, stemming)
    if (!s) continue
    m.set(s, (m.get(s) ?? 0) + 1)
  }
  return m
}

function mergeTf(
  into: Map<number, Map<string, { tt: number; tb: number; tg: number }>>,
  docId: number,
  field: 'tt' | 'tb' | 'tg',
  counts: Map<string, number>,
): void {
  let byStem = into.get(docId)
  if (!byStem) {
    byStem = new Map()
    into.set(docId, byStem)
  }
  for (const [stem, n] of counts) {
    let o = byStem.get(stem)
    if (!o) {
      o = { tt: 0, tb: 0, tg: 0 }
      byStem.set(stem, o)
    }
    o[field] += n
  }
}

function buildSuggestVocab(
  docs: SearchIndexDoc[],
  dfTitle: Record<string, number>,
  dfBody: Record<string, number>,
): string[] {
  const v = new Set<string>()
  const freqThreshold = 2
  for (const d of docs) {
    for (const w of tokenize(d.title)) {
      if (w) v.add(w)
    }
    for (const tag of d.tags) {
      const t = tag.toLowerCase().trim()
      if (t) v.add(t)
      for (const w of tokenize(tag)) {
        if (w) v.add(w)
      }
    }
  }
  for (const stem of Object.keys(dfTitle)) {
    const sum = (dfTitle[stem] ?? 0) + (dfBody[stem] ?? 0)
    if (sum >= freqThreshold) v.add(stem)
  }
  return [...v].sort((a, b) => a.localeCompare(b))
}

export interface BuildSearchIndexOptions {
  stemming?: boolean
}

export function buildSearchIndex(
  root: string,
  articles?: WikiArticle[],
  options: BuildSearchIndexOptions = {},
): void {
  const paths = kbPaths(root)
  const list = articles ?? listWikiArticles()
  const stemming = options.stemming !== false

  const byDocStem = new Map<number, Map<string, { tt: number; tb: number; tg: number }>>()

  const docs: SearchIndexDoc[] = []
  let sumTitle = 0
  let sumBody = 0
  let sumTags = 0

  for (let docId = 0; docId < list.length; docId++) {
    const a = list[docId]!
    const titleCounts = countStems(a.title, stemming)
    const bodyCounts = countStems(a.content, stemming)
    const tagsText = a.tags.join(' ')
    const tagCounts = countStems(tagsText, stemming)

    mergeTf(byDocStem, docId, 'tt', titleCounts)
    mergeTf(byDocStem, docId, 'tb', bodyCounts)
    mergeTf(byDocStem, docId, 'tg', tagCounts)

    const lenTitle = [...titleCounts.values()].reduce((s, n) => s + n, 0)
    const lenBody = [...bodyCounts.values()].reduce((s, n) => s + n, 0)
    const lenTags = [...tagCounts.values()].reduce((s, n) => s + n, 0)

    sumTitle += lenTitle
    sumBody += lenBody
    sumTags += lenTags

    const docType = typeof a.frontmatter.type === 'string' ? a.frontmatter.type : undefined
    const isOutput = a.relativePath.startsWith('output/')

    // Extract entities from frontmatter
    const entities: string[] = []
    if (a.frontmatter.entities && typeof a.frontmatter.entities === 'object') {
      for (const [type, names] of Object.entries(a.frontmatter.entities)) {
        if (Array.isArray(names)) {
          for (const name of names) {
            entities.push(`${type}/${name}`)
          }
        }
      }
    }

    docs.push({
      docId,
      relativePath: a.relativePath,
      title: a.title,
      tags: a.tags,
      entities,
      docType,
      docDateMs: parseDocDateMs(a.frontmatter, a.path),
      isOutput,
      lenTitle,
      lenBody,
      lenTags,
    })
  }

  const N = docs.length
  const avgdlTitle = N > 0 ? sumTitle / N : 0
  const avgdlBody = N > 0 ? sumBody / N : 0
  const avgdlTags = N > 0 ? sumTags / N : 0

  // Null prototype so stems like "constructor" / "__proto__" are not confused with Object.prototype.
  const postings = Object.create(null) as Record<string, SearchIndexPosting[]>
  const dfTitle = Object.create(null) as Record<string, number>
  const dfBody = Object.create(null) as Record<string, number>
  const dfTags = Object.create(null) as Record<string, number>

  for (const [docId, stemMap] of byDocStem) {
    for (const [stem, t] of stemMap) {
      const p: SearchIndexPosting = {
        docId,
        tfTitle: t.tt,
        tfBody: t.tb,
        tfTags: t.tg,
      }
      if (!postings[stem]) postings[stem] = []
      postings[stem]!.push(p)
      if (t.tt > 0) dfTitle[stem] = (dfTitle[stem] ?? 0) + 1
      if (t.tb > 0) dfBody[stem] = (dfBody[stem] ?? 0) + 1
      if (t.tg > 0) dfTags[stem] = (dfTags[stem] ?? 0) + 1
    }
  }

  for (const stem of Object.keys(postings)) {
    postings[stem]!.sort((a, b) => a.docId - b.docId)
  }

  const suggestVocab = buildSuggestVocab(docs, dfTitle, dfBody)

  const payload: SearchIndexFile = {
    schemaVersion: SEARCH_INDEX_SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    N,
    avgdlTitle,
    avgdlBody,
    avgdlTags,
    stemming,
    docs,
    postings,
    dfTitle,
    dfBody,
    dfTags,
    suggestVocab,
  }

  writeFileSync(paths.searchIndex, JSON.stringify(payload) + '\n', 'utf-8')
}

export function loadSearchIndex(root: string): SearchIndexFile | null {
  const paths = kbPaths(root)
  if (!existsSync(paths.searchIndex)) return null
  const raw = JSON.parse(readFileSync(paths.searchIndex, 'utf-8')) as SearchIndexFile
  if (raw.schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION) return null
  return raw
}

/** Map stem -> docId -> posting (single lookup per term per doc). */
export function indexPostingLookup(index: SearchIndexFile): Map<string, Map<number, SearchIndexPosting>> {
  const out = new Map<string, Map<number, SearchIndexPosting>>()
  for (const [stem, list] of Object.entries(index.postings)) {
    const m = new Map<number, SearchIndexPosting>()
    for (const p of list) {
      m.set(p.docId, p)
    }
    out.set(stem, m)
  }
  return out
}

export function resolveArticlePath(root: string, relativePath: string): string {
  return safeJoin(root, relativePath)
}
