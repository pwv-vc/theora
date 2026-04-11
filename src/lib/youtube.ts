import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { YT_DLP_INSTALL_HINT, hasYtDlp } from './deps.js'
import { formatTimecode } from './media-ffmpeg.js'
import { slugifyShort } from './utils.js'

const execFileAsync = promisify(execFile)

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

const YT_DLP_MAX_BUFFER = 10 * 1024 * 1024
const MAX_YOUTUBE_DESCRIPTION_CHARS = 4000
const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_THUMBNAIL_HOST_PATTERNS = [
  /^i\d*\.ytimg\.com$/i,
  /^i\.ytimg\.com$/i,
  /^img\.youtube\.com$/i,
]

export const YT_DLP_MISSING_MESSAGE =
  `yt-dlp not found. Install it to ingest YouTube captions: ${YT_DLP_INSTALL_HINT}`

export const NO_YOUTUBE_CAPTIONS_MESSAGE = 'No captions available for this YouTube video'
export const EMPTY_YOUTUBE_TRANSCRIPT_MESSAGE = 'YouTube captions were empty after parsing'

interface YouTubeMetadata {
  id: string
  title: string
  uploader?: string
  channel?: string
  channel_id?: string
  duration?: number
  upload_date?: string
  timestamp?: number
  description?: string
  thumbnail?: string
  webpage_url?: string
  _type?: string
}

export interface YouTubeTranscriptResult {
  videoId: string
  title: string
  channel: string
  channelId: string | null
  durationSeconds: number | null
  publishedDate: string | null
  description: string | null
  thumbnailUrl: string | null
  url: string
  markdown: string
  suggestedFilename: string
}

export interface ParsedYouTubeTranscriptMarkdown {
  title: string
  channel: string | null
  videoId: string | null
  channelId: string | null
  url: string | null
  thumbnailUrl: string | null
  duration: string | null
  publishedDate: string | null
  description: string | null
  transcript: string | null
}

function parseSupportedYouTubeUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.length > 1 ? parsed : null
    }

    if (parsed.pathname === '/watch') {
      return parsed.searchParams.get('v') ? parsed : null
    }

    if (/^\/(embed|live|shorts)\/[^/]+$/.test(parsed.pathname)) {
      return parsed
    }

    return null
  } catch {
    return null
  }
}

export function isYouTubeUrl(url: string): boolean {
  return parseSupportedYouTubeUrl(url) !== null
}

export function normalizeYouTubeInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (isYouTubeUrl(trimmed)) return trimmed

  const prefixed = trimmed.match(/^(?:youtube:|yt:)([A-Za-z0-9_-]{11})$/i)
  if (prefixed) {
    return `https://www.youtube.com/watch?v=${prefixed[1]}`
  }

  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`
  }

  return null
}

function extractExecStderr(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const stderr = Reflect.get(error, 'stderr')
  return typeof stderr === 'string' ? stderr : ''
}

function normalizeYtDlpStdErr(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0) ?? ''
}

export function mapYouTubeFailureMessage(stderr: string, fallback = 'Unable to fetch YouTube captions'): string {
  const normalized = normalizeYtDlpStdErr(stderr)
  const lower = normalized.toLowerCase()

  if (lower.includes('private video')) {
    return 'This YouTube video is private and cannot be ingested'
  }

  if (lower.includes('sign in to confirm your age') || lower.includes('age-restricted')) {
    return 'This YouTube video is age-restricted and captions cannot be fetched'
  }

  if (
    lower.includes('video unavailable')
    || lower.includes('this video is unavailable')
    || lower.includes('has been removed')
  ) {
    return 'This YouTube video is unavailable or has been removed'
  }

  if (lower.includes('unsupported url') || lower.includes('invalid url')) {
    return 'Invalid or unsupported YouTube URL'
  }

  if (normalized.length > 0) {
    return normalized.replace(/^\s*error:\s*/i, '')
  }

  return fallback
}

async function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  if (!hasYtDlp()) {
    throw new Error(YT_DLP_MISSING_MESSAGE)
  }

  try {
    const { stdout, stderr } = await execFileAsync('yt-dlp', args, {
      encoding: 'utf-8',
      maxBuffer: YT_DLP_MAX_BUFFER,
    })
    return {
      stdout: typeof stdout === 'string' ? stdout : String(stdout),
      stderr: typeof stderr === 'string' ? stderr : String(stderr),
    }
  } catch (error) {
    const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : null
    if (code === 'ENOENT') {
      throw new Error(YT_DLP_MISSING_MESSAGE)
    }
    throw error
  }
}

async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  try {
    const { stdout } = await runYtDlp(['--dump-json', '--no-playlist', url])
    const parsed = JSON.parse(stdout.trim()) as YouTubeMetadata
    if (parsed._type === 'playlist') {
      throw new Error('Playlist URLs are not supported. Pass a single YouTube video URL')
    }
    if (!parsed.id) {
      throw new Error('Unable to determine the YouTube video id')
    }
    return parsed
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('yt-dlp returned invalid metadata for this YouTube URL')
    }
    if (error instanceof Error && error.message === YT_DLP_MISSING_MESSAGE) {
      throw error
    }
    if (error instanceof Error && error.message.length > 0 && !error.message.startsWith('Command failed:')) {
      throw error
    }
    throw new Error(mapYouTubeFailureMessage(extractExecStderr(error), 'Could not fetch YouTube video metadata'))
  }
}

function findDownloadedVtt(tempDir: string): string | null {
  const vttFile = readdirSync(tempDir)
    .filter(name => name.endsWith('.vtt'))
    .sort()[0]
  return vttFile ? join(tempDir, vttFile) : null
}

async function downloadCaptionVtt(url: string, tempDir: string): Promise<string> {
  let lastStdErr = ''

  for (const flag of ['--write-subs', '--write-auto-subs']) {
    try {
      const { stderr } = await runYtDlp([
        flag,
        '--sub-langs',
        'en.*',
        '--sub-format',
        'vtt',
        '--skip-download',
        '--no-playlist',
        '-o',
        join(tempDir, 'transcript'),
        url,
      ])
      lastStdErr = stderr
    } catch (error) {
      if (error instanceof Error && error.message === YT_DLP_MISSING_MESSAGE) {
        throw error
      }
      lastStdErr = extractExecStderr(error)
    }

    const vttPath = findDownloadedVtt(tempDir)
    if (vttPath) {
      return readFileSync(vttPath, 'utf-8')
    }
  }

  throw new Error(
    lastStdErr.trim().length > 0
      ? mapYouTubeFailureMessage(lastStdErr, NO_YOUTUBE_CAPTIONS_MESSAGE)
      : NO_YOUTUBE_CAPTIONS_MESSAGE,
  )
}

export function parseVttTranscript(vttContent: string): string {
  const textLines: string[] = []

  for (const rawLine of vttContent.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^\d+$/.test(line)) continue
    if (line.includes('-->')) continue
    if (/^(WEBVTT|NOTE|Kind:|Language:|STYLE|REGION|align:)/.test(line)) continue

    const cleaned = line.replace(/<[^>]+>/g, '').trim()
    if (cleaned) {
      textLines.push(cleaned)
    }
  }

  const deduped: string[] = []
  let previous = ''
  for (const line of textLines) {
    if (line !== previous) {
      deduped.push(line)
      previous = line
    }
  }

  return deduped.join(' ').trim()
}

export function suggestYouTubeTranscriptFilename(videoId: string, title: string): string {
  const slug = slugifyShort(title, 50)
  return slug ? `youtube-${videoId}-${slug}.md` : `youtube-${videoId}.md`
}

function normalizePublishedDate(uploadDate?: string, timestamp?: number): string | null {
  if (uploadDate && /^\d{8}$/.test(uploadDate)) {
    return `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`
  }
  if (typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp * 1000).toISOString().slice(0, 10)
  }
  return null
}

function formatDuration(durationSeconds: number | null): string {
  if (durationSeconds === null || durationSeconds <= 0) return 'Unknown'
  return formatTimecode(durationSeconds)
}

function collapseWhitespace(value: string): string {
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

function sanitizeYouTubeDescriptionText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = collapseWhitespace(
    stripControlChars(value)
      .replace(/[^\p{L}\p{N}\s.,!?;:'"()[\]\/@#&%+*$=_-]+/gu, ' ')
      .slice(0, MAX_YOUTUBE_DESCRIPTION_CHARS),
  )
  return cleaned.length > 0 ? cleaned : null
}

function sanitizeYouTubeCaptionText(value: string): string {
  return collapseWhitespace(
    stripControlChars(value)
      .replace(/[^\p{L}\p{M}\p{P}\s]+/gu, ' ')
      .replace(/\s+([.,!?;:'")\]])/g, '$1')
      .replace(/([(])\s+/g, '$1'),
  )
}

function sanitizeYouTubeThumbnailUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    if (!YOUTUBE_THUMBNAIL_HOST_PATTERNS.some(re => re.test(parsed.hostname))) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function renderYouTubeTranscriptMarkdown(
  result: Pick<
    YouTubeTranscriptResult,
    'title' | 'channel' | 'videoId' | 'channelId' | 'url' | 'thumbnailUrl' | 'durationSeconds' | 'publishedDate' | 'description'
  > & { transcript: string; durationText?: string | null },
): string {
  const descriptionBlock = result.description?.trim()
    ? `## Description

${result.description.trim()}

`
    : ''

  return `# ${result.title}

**Channel:** ${result.channel}  
**Video ID:** ${result.videoId}  
**Channel ID:** ${result.channelId ?? 'Unknown'}  
**URL:** ${result.url}  
**Thumbnail URL:** ${result.thumbnailUrl ?? 'Unknown'}  
**Published:** ${result.publishedDate ?? 'Unknown'}  
**Duration:** ${result.durationText ?? formatDuration(result.durationSeconds)}  
**Source:** YouTube captions

_Automated or creator-provided captions; may contain errors._

${descriptionBlock}## Transcript

${result.transcript}
`
}

function extractMarkdownSection(markdown: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'm')
  const match = markdown.match(re)
  return match?.[1]?.trim() || null
}

export function sanitizeExistingYouTubeTranscriptMarkdown(markdown: string): string {
  const parsed = parseYouTubeTranscriptMarkdown(markdown)
  if (!parsed || !parsed.transcript) return markdown

  return renderYouTubeTranscriptMarkdown({
    title: parsed.title,
    channel: parsed.channel ?? 'Unknown channel',
    videoId: parsed.videoId ?? 'unknown',
    channelId: parsed.channelId,
    url: parsed.url ?? 'Unknown',
    thumbnailUrl: sanitizeYouTubeThumbnailUrl(parsed.thumbnailUrl),
    durationSeconds: null,
    durationText: parsed.duration,
    publishedDate: parsed.publishedDate,
    description: sanitizeYouTubeDescriptionText(parsed.description),
    transcript: sanitizeYouTubeCaptionText(parsed.transcript),
  })
}

export function parseYouTubeTranscriptMarkdown(markdown: string): ParsedYouTubeTranscriptMarkdown | null {
  if (!markdown.includes('**Source:** YouTube captions')) return null

  const lines = markdown.split(/\r?\n/)
  const titleLine = lines.find(line => line.startsWith('# '))
  const matchField = (label: string): string | null => {
    const line = lines.find(entry => entry.startsWith(`**${label}:** `))
    return line ? line.slice(`**${label}:** `.length).trim() : null
  }
  const knownValue = (value: string | null): string | null => value && value !== 'Unknown' ? value : null

  const title = titleLine?.slice(2).trim()
  if (!title) return null

  const publishedValue = matchField('Published')

  return {
    title,
    channel: knownValue(matchField('Channel')),
    videoId: knownValue(matchField('Video ID')),
    channelId: knownValue(matchField('Channel ID')),
    url: knownValue(matchField('URL')),
    thumbnailUrl: sanitizeYouTubeThumbnailUrl(knownValue(matchField('Thumbnail URL'))),
    duration: knownValue(matchField('Duration')),
    publishedDate: knownValue(publishedValue),
    description: sanitizeYouTubeDescriptionText(extractMarkdownSection(markdown, 'Description')),
    transcript: (() => {
      const cleaned = sanitizeYouTubeCaptionText(extractMarkdownSection(markdown, 'Transcript') ?? '')
      return cleaned.length > 0 ? cleaned : null
    })(),
  }
}

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  if (!isYouTubeUrl(url)) {
    throw new Error('Invalid or unsupported YouTube URL')
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'theora-youtube-'))

  try {
    const metadata = await fetchYouTubeMetadata(url)
    const transcript = sanitizeYouTubeCaptionText(parseVttTranscript(await downloadCaptionVtt(url, tempDir)))
    if (!transcript) {
      throw new Error(EMPTY_YOUTUBE_TRANSCRIPT_MESSAGE)
    }

    const title = metadata.title || `YouTube video ${metadata.id}`
    const channel = metadata.uploader || metadata.channel || 'Unknown channel'
    const channelId = metadata.channel_id ?? null
    const durationSeconds = typeof metadata.duration === 'number' ? metadata.duration : null
    const publishedDate = normalizePublishedDate(metadata.upload_date, metadata.timestamp)
    const description = sanitizeYouTubeDescriptionText(metadata.description)
    const thumbnailUrl = sanitizeYouTubeThumbnailUrl(metadata.thumbnail)
    const canonicalUrl = metadata.webpage_url || url

    return {
      videoId: metadata.id,
      title,
      channel,
      channelId,
      durationSeconds,
      publishedDate,
      description,
      thumbnailUrl,
      url: canonicalUrl,
      markdown: renderYouTubeTranscriptMarkdown({
        title,
        channel,
        videoId: metadata.id,
        channelId,
        url: canonicalUrl,
        thumbnailUrl,
        durationSeconds,
        publishedDate,
        description,
        transcript,
      }),
      suggestedFilename: suggestYouTubeTranscriptFilename(metadata.id, title),
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}
