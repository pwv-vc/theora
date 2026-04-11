/** Max consecutive newlines after collapse (limits prompt bloat from hostile docs). */
const MAX_CONSECUTIVE_NEWLINES = 3

/**
 * Plain-text hygiene for body text extracted from binary documents (e.g. mammoth, pdf-parse).
 * Not a substitute for prompt delimiters or trusting your ingest sources.
 */
export function sanitizeExtractedDocumentText(text: string): string {
  let s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/\u2028/g, '\n').replace(/\u2029/g, '\n\n')
  // C0 controls except TAB and LF; DEL
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Bidi / embedding controls (often abused for spoofing or odd display)
  s = s.replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
  const cap = '\n'.repeat(MAX_CONSECUTIVE_NEWLINES)
  const collapseRe = new RegExp(`\\n{${MAX_CONSECUTIVE_NEWLINES + 1},}`, 'g')
  s = s.replace(collapseRe, cap)
  return s.trim()
}
