/** Robertson–Spärck Jones IDF (BM25). */
export function bm25Idf(N: number, df: number): number {
  if (N <= 0) return 0
  const d = Math.min(df, N)
  return Math.log(1 + (N - d + 0.5) / (d + 0.5))
}

const BM25_K1 = 1.2
const BM25_B = 0.75

export function bm25TermScore(
  idf: number,
  tf: number,
  docLen: number,
  avgdl: number,
  k1: number = BM25_K1,
  b: number = BM25_B,
): number {
  if (tf <= 0 || idf <= 0) return 0
  const safeLen = docLen > 0 ? docLen : 1
  const safeAvg = avgdl > 0 ? avgdl : 1
  const denom = tf + k1 * (1 - b + (b * safeLen) / safeAvg)
  return idf * ((tf * (k1 + 1)) / denom)
}
