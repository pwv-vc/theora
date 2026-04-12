import { stemmer } from 'stemmer'

/** Match Unicode letters and numbers inside words (letters-first token). */
const TOKEN_RE = /\p{L}[\p{L}\p{N}]*/gu

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(TOKEN_RE)
  return m ?? []
}

export function stemWord(word: string, useStemming: boolean): string {
  if (!word) return ''
  return useStemming ? stemmer(word) : word
}

/** Whitespace-separated query pieces (lowercased), before per-token splitting. */
export function queryRawTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Stems for BM25: each whitespace segment may expand to several stemmed tokens
 * (e.g. hyphenated words in titles).
 */
export function queryToStems(query: string, useStemming: boolean): string[] {
  const stems = new Set<string>()
  for (const part of queryRawTokens(query)) {
    for (const t of tokenize(part)) {
      const s = stemWord(t, useStemming)
      if (s) stems.add(s)
    }
  }
  return [...stems]
}
