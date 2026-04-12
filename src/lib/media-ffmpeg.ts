import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)
import type { KbConfig } from './config.js'

export type MediaVideoFfmpegConfig = Pick<
  KbConfig,
  | 'videoFramesPerMinute'
  | 'videoMinFrames'
  | 'videoMaxFrames'
  | 'videoFrameVisionMaxEdgePx'
  | 'videoFrameJpegQuality'
  | 'whisperAudioTargetSampleRateHz'
  | 'whisperAudioMono'
>

export function hasFfprobe(): boolean {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** True if the file has at least one audio stream (for skipping Whisper when video is silent). */
export async function hasMediaAudioStream(mediaPath: string): Promise<boolean> {
  if (!hasFfprobe()) return true
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=index',
        '-of',
        'csv=p=0',
        mediaPath,
      ],
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 },
    )
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

/** Duration in seconds for video or audio, or null if unavailable */
export async function getFfprobeDurationSeconds(mediaPath: string): Promise<number | null> {
  if (!hasFfprobe()) return null
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        mediaPath,
      ],
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 },
    )
    const t = parseFloat(String(stdout).trim())
    if (!Number.isFinite(t) || t <= 0) return null
    return t
  } catch {
    return null
  }
}

export async function extractAudioForWhisper(
  sourcePath: string,
  outWavPath: string,
  cfg: MediaVideoFfmpegConfig,
): Promise<void> {
  const args = ['-y', '-i', sourcePath, '-vn']
  if (cfg.whisperAudioMono !== false) {
    args.push('-ac', '1')
  }
  args.push('-ar', String(cfg.whisperAudioTargetSampleRateHz ?? 16000), '-f', 'wav', outWavPath)
  await execFileAsync('ffmpeg', args)
}

/** Evenly spaced sample times in seconds (see plan §3.5) */
export function computeFrameSchedule(
  durationSec: number | null,
  cfg: Pick<KbConfig, 'videoFramesPerMinute' | 'videoMinFrames' | 'videoMaxFrames'>,
): number[] {
  const F = cfg.videoFramesPerMinute ?? 12
  const minF = cfg.videoMinFrames ?? 2
  const maxF = cfg.videoMaxFrames ?? 24
  const epsilon = 0.05

  const T = durationSec !== null && durationSec > 0 ? durationSec : null
  if (T === null) {
    return [Math.max(epsilon, 0.1)]
  }

  const nRaw = Math.ceil((T * F) / 60)
  const n = Math.min(maxF, Math.max(minF, nRaw))
  const times: number[] = []
  for (let i = 0; i < n; i++) {
    let t = ((i + 0.5) * T) / n
    t = Math.min(Math.max(t, epsilon), Math.max(T - epsilon, epsilon))
    times.push(t)
  }
  return times
}

export interface VisionFrameExtract {
  path: string
  timeSec: number
}

/**
 * Extract one JPEG per timestamp; scale so longer edge <= videoFrameVisionMaxEdgePx.
 * Uses `-ss` before `-i` (input seek): fast, keyframe-aligned; fine for representative samples.
 * `onFrame` is invoked with 1-based index before each ffmpeg invocation (for progress UI).
 */
export async function extractVisionFramesJpeg(
  videoPath: string,
  outDir: string,
  timesSec: number[],
  cfg: MediaVideoFfmpegConfig,
  onFrame?: (index1: number, total: number) => void,
): Promise<VisionFrameExtract[]> {
  const maxEdge = cfg.videoFrameVisionMaxEdgePx ?? 768
  const q = String(cfg.videoFrameJpegQuality ?? 6)
  const vf = `scale=min(iw\\,${maxEdge}):-2:force_original_aspect_ratio=decrease`

  const results: VisionFrameExtract[] = []
  const total = timesSec.length
  for (let i = 0; i < total; i++) {
    const t = timesSec[i]!
    onFrame?.(i + 1, total)
    const outPath = join(outDir, `frame-${String(i).padStart(3, '0')}.jpg`)
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      String(t),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      vf,
      '-q:v',
      q,
      outPath,
    ])
    results.push({ path: outPath, timeSec: t })
  }
  return results
}

export function formatTimecode(sec: number): string {
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}
