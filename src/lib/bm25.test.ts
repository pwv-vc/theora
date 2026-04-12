import { describe, expect, it } from 'vitest'
import { bm25Idf, bm25TermScore } from './bm25.js'

describe('bm25Idf', () => {
  it('increases when document frequency is low', () => {
    const rare = bm25Idf(100, 1)
    const common = bm25Idf(100, 50)
    expect(rare).toBeGreaterThan(common)
  })

  it('is zero when corpus is empty', () => {
    expect(bm25Idf(0, 0)).toBe(0)
  })
})

describe('bm25TermScore', () => {
  it('returns zero when tf is zero', () => {
    expect(bm25TermScore(2, 0, 10, 10)).toBe(0)
  })

  it('saturates as tf grows (second increment smaller than first)', () => {
    const idf = 1
    const len = 20
    const avg = 20
    const s1 = bm25TermScore(idf, 1, len, avg)
    const s5 = bm25TermScore(idf, 5, len, avg)
    expect(s5).toBeGreaterThan(s1)
    expect(s5).toBeLessThanOrEqual(5 * s1)
  })
})
