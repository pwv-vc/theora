import { describe, expect, it } from 'vitest'
import { escapeRegex, queryRawTokens, tokenize } from './searchTokenize.js'

describe('escapeRegex', () => {
  it('escapes metacharacters for RegExp', () => {
    const s = '('
    expect(new RegExp(escapeRegex(s)).test(s)).toBe(true)
    expect(() => new RegExp(s)).toThrow()
  })
})

describe('tokenize', () => {
  it('extracts letter tokens from noisy input', () => {
    expect(tokenize('c++ (foo)')).toEqual(['c', 'foo'])
  })
})

describe('queryRawTokens', () => {
  it('splits on whitespace', () => {
    expect(queryRawTokens('  foo   bar  ')).toEqual(['foo', 'bar'])
  })
})
