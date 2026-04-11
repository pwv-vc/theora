import { describe, expect, it } from 'vitest'
import { sanitizeExtractedDocumentText } from './extracted-text.js'

describe('sanitizeExtractedDocumentText', () => {
  it('strips NUL and other C0 controls except tab and newline', () => {
    expect(sanitizeExtractedDocumentText('a\0b')).toBe('ab')
    expect(sanitizeExtractedDocumentText('x\x01\x02y')).toBe('xy')
    expect(sanitizeExtractedDocumentText('t\ty')).toBe('t\ty')
    expect(sanitizeExtractedDocumentText('line1\nline2')).toBe('line1\nline2')
  })

  it('normalizes CRLF and lone CR to LF', () => {
    expect(sanitizeExtractedDocumentText('a\r\nb')).toBe('a\nb')
    expect(sanitizeExtractedDocumentText('a\rb')).toBe('a\nb')
  })

  it('collapses long runs of blank lines', () => {
    expect(sanitizeExtractedDocumentText('a\n\n\n\n\nb')).toBe('a\n\n\nb')
  })

  it('strips bidi override characters', () => {
    expect(sanitizeExtractedDocumentText('a\u202Eb')).toBe('ab')
  })

  it('preserves normal paragraphs', () => {
    const t = 'First paragraph.\n\nSecond line.\n\nThird.'
    expect(sanitizeExtractedDocumentText(t)).toBe(t)
  })

  it('trims outer whitespace', () => {
    expect(sanitizeExtractedDocumentText('  hello  ')).toBe('hello')
  })
})
