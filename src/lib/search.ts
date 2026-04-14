import { distance } from 'fastest-levenshtein'
import { readConfig } from './config.js'
import { requireKbRoot } from './paths.js'
import { listWikiArticles, readWikiArticle } from './wiki.js'
import { bm25Idf, bm25TermScore } from './bm25.js'
import {
  escapeRegex,
  queryRawTokens,
  queryToStems,
  stemWord,
  tokenize,
} from './search-tokenize.js'
import {
  indexPostingLookup,
  loadSearchIndex,
  resolveArticlePath,
  type SearchIndexFile,
  type SearchIndexPosting,
} from './search-index.js'
import type { SearchTuningConfig } from './config.js'

const DAY_MS = 86_400_000
const SNIPPET_MAX = 220
const SNIPPET_HALF_WINDOW = 100
const SNIPPET_HYDRATE_TOP = 50

export interface SearchResult {
  title: string
  path: string
  relativePath: string
  tags: string[]
  score: number
  snippet: string
  docType?: string
}

export interface SearchResponse {
  results: SearchResult[]
  suggestedQuery?: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, (_, s: string) => s.replace(/-/g, ' '))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lineStemOverlapScore(line: string, stems: Set<string>, useStemming: boolean): number {
  const seen = new Set<string>()
  let hits = 0
  for (const w of tokenize(line)) {
    const s = stemWord(w, useStemming)
    if (stems.has(s)) {
      if (!seen.has(s)) {
        seen.add(s)
        hits += 1
      }
      hits += 0.25
    }
  }
  return hits
}

function extractSnippet(
  content: string,
  rawTokens: string[],
  stems: string[],
  useStemming: boolean,
): string {
  const stemSet = new Set(stems)
  const lines = content.split('\n').filter(l => l.trim())
  let bestLine = ''
  let bestScore = -1
  for (const line of lines) {
    const sc = lineStemOverlapScore(line, stemSet, useStemming)
    if (sc > bestScore) {
      bestScore = sc
      bestLine = line
    }
  }
  if (!bestLine && lines.length > 0) {
    bestLine = lines[0]!
  }
  if (!bestLine) return ''

  const cleanedFull = stripMarkdown(bestLine)
  if (!cleanedFull) return ''

  let anchor = Math.min(SNIPPET_HALF_WINDOW, Math.floor(cleanedFull.length / 2))
  for (const t of rawTokens) {
    if (t.length < 2) continue
    const re = new RegExp(escapeRegex(t), 'i')
    const m = re.exec(cleanedFull)
    if (m && m.index >= 0) {
      anchor = m.index
      break
    }
  }

  const start = Math.max(0, anchor - SNIPPET_HALF_WINDOW)
  let slice = cleanedFull.slice(start, start + SNIPPET_MAX)
  if (start > 0) slice = '...' + slice
  if (start + SNIPPET_MAX < cleanedFull.length) slice = slice + '...'
  return slice
}

function recencyMultiplier(docDateMs: number, halfLifeDays: number, now: number): number {
  if (halfLifeDays <= 0) return 1
  const ageDays = Math.max(0, (now - docDateMs) / DAY_MS)
  return Math.pow(0.5, ageDays / halfLifeDays)
}

function scoreDocument(
  index: SearchIndexFile,
  lookup: Map<string, Map<number, SearchIndexPosting>>,
  docId: number,
  stems: string[],
  tuning: SearchTuningConfig,
  now: number,
): number {
  const d = index.docs[docId]
  if (!d) return 0

  const { fieldWeights: w, recencyHalfLifeDays, outputWeight } = tuning
  const N = index.N

  let sum = 0
  for (const stem of stems) {
    const posting = lookup.get(stem)?.get(docId)
    if (!posting) continue

    const dfT = index.dfTitle[stem] ?? 0
    const dfB = index.dfBody[stem] ?? 0
    const dfG = index.dfTags[stem] ?? 0

    const idfT = bm25Idf(N, dfT)
    const idfB = bm25Idf(N, dfB)
    const idfG = bm25Idf(N, dfG)

    sum += w.title * bm25TermScore(idfT, posting.tfTitle, d.lenTitle, index.avgdlTitle)
    sum += w.body * bm25TermScore(idfB, posting.tfBody, d.lenBody, index.avgdlBody)
    sum += w.tags * bm25TermScore(idfG, posting.tfTags, d.lenTags, index.avgdlTags)
  }

  const rec = recencyMultiplier(d.docDateMs, recencyHalfLifeDays, now)
  const out = d.isOutput ? outputWeight : 1
  return sum * rec * out
}

function fuzzySuggestQuery(
  rawTokens: string[],
  vocab: string[],
  maxEdits: number,
  minLen: number,
): string | undefined {
  if (rawTokens.length === 0) return undefined
  let changed = false
  const out = rawTokens.map(tok => {
    if (tok.length < minLen) return tok
    if (vocab.includes(tok)) return tok
    let best: { w: string; d: number } | null = null
    for (const w of vocab) {
      if (Math.abs(w.length - tok.length) > maxEdits * 2) continue
      const d = distance(tok, w)
      if (d <= maxEdits && (!best || d < best.d)) best = { w, d }
    }
    if (best && best.d > 0) {
      changed = true
      return best.w
    }
    return tok
  })
  return changed ? out.join(' ') : undefined
}

function emptyQueryResults(filterTag?: string, filterEntity?: string): SearchResponse {
  let articles = listWikiArticles()
  if (filterTag) {
    articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
  }
  if (filterEntity) {
    const normalizedEntity = filterEntity.toLowerCase()
    articles = articles.filter(a => {
      if (!a.frontmatter.entities || typeof a.frontmatter.entities !== 'object') return false
      return Object.entries(a.frontmatter.entities).some(([type, names]) => {
        if (!Array.isArray(names)) return false
        return names.some((name: string) => `${type}/${name}`.toLowerCase() === normalizedEntity)
      })
    })
  }
  return {
    results: articles
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(article => ({
        title: article.title,
        path: article.path,
        relativePath: article.relativePath,
        tags: article.tags,
        score: 0,
        snippet: extractSnippet(article.content, [], [], true),
        docType: typeof article.frontmatter.type === 'string' ? article.frontmatter.type : undefined,
      })),
  }
}

/**
 * BM25 search over `.theora/search-index.json` (rebuilt by `theora compile` / `--reindex`).
 */
export function searchArticles(query: string, filterTag?: string, filterEntity?: string): SearchResponse {
  const root = requireKbRoot()
  const tuning = readConfig().search
  const rawTokens = queryRawTokens(query)

  if (rawTokens.length === 0) {
    return emptyQueryResults(filterTag, filterEntity)
  }

  const index = loadSearchIndex(root)
  if (!index) {
    throw new Error(
      'Search index not found or outdated. Run `theora compile --reindex` to build `.theora/search-index.json`.',
    )
  }

  const useStemming = index.stemming
  const stems = queryToStems(query, useStemming)

  const allowed = new Set<number>()
  for (let i = 0; i < index.docs.length; i++) {
    const d = index.docs[i]!
    
    // Check tag filter
    if (filterTag) {
      if (!d.tags.some(t => t.toLowerCase() === filterTag.toLowerCase())) {
        continue
      }
    }
    
    // Check entity filter
    if (filterEntity) {
      const normalizedEntity = filterEntity.toLowerCase()
      if (!d.entities.some(e => e.toLowerCase() === normalizedEntity)) {
        continue
      }
    }
    
    allowed.add(i)
  }

  if (stems.length === 0) {
    const suggestedQuery = tuning.fuzzy
      ? fuzzySuggestQuery(
          rawTokens,
          index.suggestVocab,
          tuning.fuzzyMaxEdits,
          tuning.fuzzyMinTokenLength,
        )
      : undefined
    return { results: [], suggestedQuery }
  }

  const candidates = new Set<number>()
  for (const stem of stems) {
    const posts = index.postings[stem]
    if (!posts) continue
    for (const p of posts) {
      if (allowed.has(p.docId)) candidates.add(p.docId)
    }
  }

  const lookup = indexPostingLookup(index)
  const now = Date.now()

  const scored: { docId: number; score: number }[] = []
  for (const docId of candidates) {
    const score = scoreDocument(index, lookup, docId, stems, tuning, now)
    if (score > 0) scored.push({ docId, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ta = index.docs[a.docId]!.title
    const tb = index.docs[b.docId]!.title
    return ta.localeCompare(tb)
  })

  let suggestedQuery: string | undefined
  const topScore = scored[0]?.score ?? 0
  const weak =
    scored.length === 0 ||
    topScore < tuning.weakScoreThreshold

  if (tuning.fuzzy && weak) {
    suggestedQuery = fuzzySuggestQuery(
      rawTokens,
      index.suggestVocab,
      tuning.fuzzyMaxEdits,
      tuning.fuzzyMinTokenLength,
    )
  }

  const topIds = scored.slice(0, SNIPPET_HYDRATE_TOP).map(s => s.docId)
  const snippetByDoc = new Map<number, string>()
  for (const docId of topIds) {
    const d = index.docs[docId]!
    try {
      const abs = resolveArticlePath(root, d.relativePath)
      const article = readWikiArticle(abs)
      snippetByDoc.set(
        docId,
        extractSnippet(article.content, rawTokens, stems, useStemming),
      )
    } catch {
      snippetByDoc.set(docId, '')
    }
  }

  const results: SearchResult[] = scored.map(({ docId, score }) => {
    const d = index.docs[docId]!
    const abs = resolveArticlePath(root, d.relativePath)
    return {
      title: d.title,
      path: abs,
      relativePath: d.relativePath,
      tags: d.tags,
      score,
      snippet: snippetByDoc.get(docId) ?? '',
      docType: d.docType,
    }
  })

  return { results, suggestedQuery }
}
