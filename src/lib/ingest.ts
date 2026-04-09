import { writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { slugify } from './utils.js'

export const VALID_EXTS = new Set([
  '.md', '.mdx', '.txt', '.html', '.json', '.csv', '.xml', '.yaml', '.yml',
  '.pdf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
])

export const CONTENT_TYPE_EXT: Record<string, string> = {
  'text/html': '.html',
  'text/plain': '.txt',
  'application/json': '.json',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024

export function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://')
}

export function isValidFile(path: string): boolean {
  return VALID_EXTS.has(extname(path).toLowerCase())
}

export function filenameFromUrl(url: string, contentType: string): string {
  const parsed = new URL(url)
  const pathPart = parsed.pathname.replace(/\/$/, '')
  const urlBasename = pathPart.split('/').pop() ?? ''
  const urlExt = extname(urlBasename).toLowerCase()

  if (urlExt && VALID_EXTS.has(urlExt)) {
    const stem = urlBasename.slice(0, -urlExt.length)
    return `${slugify(stem || parsed.hostname)}${urlExt}`
  }

  const mimeBase = contentType.split(';')[0].trim()
  const ext = CONTENT_TYPE_EXT[mimeBase] ?? '.html'
  const stem = urlBasename ? slugify(urlBasename) : slugify(parsed.hostname + parsed.pathname)
  return `${stem}${ext}`
}

export async function fetchUrl(url: string, destDir: string): Promise<{ name: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? 'text/html'
  const name = filenameFromUrl(url, contentType)
  const destPath = join(destDir, name)

  const mimeBase = contentType.split(';')[0].trim()
  const isImage = mimeBase.startsWith('image/')

  if (isImage) {
    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(destPath, buffer)
  } else {
    const text = await response.text()
    writeFileSync(destPath, text)
  }

  return { name }
}

export interface IngestResult {
  name: string
  status: 'ingested' | 'skipped_dupe' | 'skipped_type' | 'skipped_size' | 'error'
  error?: string
}

export async function ingestWebFile(
  file: File,
  destDir: string,
  existingNames: Set<string>,
): Promise<IngestResult> {
  const name = file.name

  if (!isValidFile(name)) {
    return { name, status: 'skipped_type', error: `${name}: unsupported file type` }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { name, status: 'skipped_size', error: `${name}: exceeds 50 MB limit` }
  }

  if (existingNames.has(name)) {
    return { name, status: 'skipped_dupe' }
  }

  const destPath = join(destDir, name)
  const buffer = Buffer.from(await file.arrayBuffer())
  writeFileSync(destPath, buffer)
  existingNames.add(name)

  return { name, status: 'ingested' }
}

export async function ingestWebUrl(
  url: string,
  destDir: string,
  existingNames: Set<string>,
): Promise<IngestResult> {
  if (!isUrl(url)) {
    return { name: url, status: 'error', error: `${url}: not a valid URL` }
  }

  try {
    const { name } = await fetchUrl(url, destDir)

    if (existingNames.has(name)) {
      return { name, status: 'skipped_dupe' }
    }

    existingNames.add(name)
    return { name, status: 'ingested' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { name: url, status: 'error', error: msg }
  }
}
