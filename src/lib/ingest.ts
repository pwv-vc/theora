import { writeFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { lookup } from 'node:dns/promises'
import { slugify } from './utils.js'
import { safeJoin } from './paths.js'
import { readConfig } from './config.js'

export const VALID_EXTS = new Set([
  '.md', '.mdx', '.txt', '.html', '.json', '.csv', '.xml', '.yaml', '.yml',
  '.pdf', '.docx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.mp3', '.wav', '.ogg', '.flac', '.m4a',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
])

export const CONTENT_TYPE_EXT: Record<string, string> = {
  'text/html': '.html',
  'text/plain': '.txt',
  'application/json': '.json',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
  'video/webm': '.webm',
}

/** Legacy default when config is unavailable */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm'])

const DEFAULT_VIDEO_MAX_BYTES = 100 * 1024 * 1024

function mediaMaxBytes(): number {
  try {
    return readConfig().mediaMaxFileBytes ?? MAX_FILE_SIZE
  } catch {
    return MAX_FILE_SIZE
  }
}

function videoMaxBytes(): number {
  try {
    return readConfig().videoMaxFileBytes ?? DEFAULT_VIDEO_MAX_BYTES
  } catch {
    return DEFAULT_VIDEO_MAX_BYTES
  }
}

/** Ingest byte limit for a local filename (by extension). */
export function maxIngestBytesForFilename(filename: string): number {
  const ext = extname(filename).toLowerCase()
  return VIDEO_EXTS.has(ext) ? videoMaxBytes() : mediaMaxBytes()
}

function maxBytesForMime(mimeBase: string): number {
  if (mimeBase.startsWith('video/')) return videoMaxBytes()
  return mediaMaxBytes()
}

function isBinaryResponseMime(mimeBase: string): boolean {
  if (mimeBase.startsWith('image/') || mimeBase.startsWith('audio/') || mimeBase.startsWith('video/')) return true
  if (mimeBase === 'application/pdf') return true
  if (mimeBase === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true
  return false
}

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

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

async function isPrivateUrl(urlStr: string): Promise<boolean> {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname
    if (hostname === 'localhost' || hostname === '0.0.0.0') return true
    const { address } = await lookup(hostname)
    return PRIVATE_IP_RANGES.some(re => re.test(address))
  } catch {
    return true
  }
}

export async function fetchUrl(url: string, destDir: string): Promise<{ name: string }> {
  if (await isPrivateUrl(url)) {
    throw new Error(`Blocked: "${url}" resolves to a private or internal address`)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? 'text/html'
  const mimeBase = contentType.split(';')[0].trim()
  const maxBytes = maxBytesForMime(mimeBase)

  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new Error(`Response too large (${contentLength} bytes, max ${maxBytes})`)
  }

  const name = filenameFromUrl(url, contentType)
  const destPath = safeJoin(destDir, name)

  const binaryStream = isBinaryResponseMime(mimeBase)

  if (binaryStream) {
    const chunks: Buffer[] = []
    let totalBytes = 0
    const reader = response.body!.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.length
      if (totalBytes > maxBytes) {
        throw new Error(`Response exceeded ${maxBytes} byte limit`)
      }
      chunks.push(Buffer.from(value))
    }
    writeFileSync(destPath, Buffer.concat(chunks))
  } else {
    const chunks: Buffer[] = []
    let totalBytes = 0
    const reader = response.body!.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.length
      if (totalBytes > maxBytes) {
        throw new Error(`Response exceeded ${maxBytes} byte limit`)
      }
      chunks.push(Buffer.from(value))
    }
    writeFileSync(destPath, Buffer.concat(chunks).toString('utf-8'))
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
  const name = basename(file.name)
  const maxBytes = maxIngestBytesForFilename(name)

  if (!isValidFile(name)) {
    return { name, status: 'skipped_type', error: `${name}: unsupported file type` }
  }

  if (file.size > maxBytes) {
    return { name, status: 'skipped_size', error: `${name}: exceeds ${maxBytes} byte limit` }
  }

  if (existingNames.has(name)) {
    return { name, status: 'skipped_dupe' }
  }

  const destPath = safeJoin(destDir, name)
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
