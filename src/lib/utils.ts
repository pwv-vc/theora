import { basename, extname } from 'node:path'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugifyShort(text: string, maxLen = 60): string {
  return slugify(text).slice(0, maxLen)
}

export function titleFromFilename(file: string): string {
  return basename(file, extname(file))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/**
 * Normalize a tag to use hyphens consistently.
 * Converts spaces to hyphens, removes extra whitespace, lowercases.
 * This ensures "sneaker pimps" becomes "sneaker-pimps" to match ingest conventions.
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
}

/**
 * Format duration in milliseconds to human-readable string.
 * - Under 5000ms: shows as ms (e.g., "1234ms")
 * - 5000ms to 60s: shows as seconds with 3 decimal places (e.g., "5.123s")
 * - Over 60s: shows as minutes:seconds with 3 decimal places (e.g., "1:23.456")
 */
export function formatDuration(ms: number): string {
  if (ms < 5000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(3)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = (secs % 60).toFixed(3)
  return `${mins}m ${remainSecs}s`
}
