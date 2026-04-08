import { basename, extname } from 'node:path'

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
