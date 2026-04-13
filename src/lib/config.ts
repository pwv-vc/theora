import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { kbPaths, requireKbRoot } from './paths.js'
import { DEFAULT_MODELS, type Provider } from './types.js'

export interface ModelConfig {
  default?: string
  compile?: string
  vision?: string
  concepts?: string
  ask?: string
  slides?: string
  chart?: string
  lint?: string
  rank?: string
  /** OpenAI Audio API model (e.g. whisper-1); always uses official OpenAI, not openai-compatible chat URL */
  transcribe?: string
  /** Model for kb create command */
  'kb-create'?: string
  /** Model for kb create search */
  'kb-create-search'?: string
  /** Model for web search */
  'web-search'?: string
}

export interface LocalModelPricingConfig {
  mode: 'duration' | 'zero'
  powerWatts: number
  electricityUsdPerKwh: number
  hardwareUsdPerHour: number
}

export interface SearchFieldWeights {
  title: number
  body: number
  tags: number
}

export interface SearchTuningConfig {
  fieldWeights: SearchFieldWeights
  /** Multiplier applied to BM25 score for articles under `output/` (0–1]. */
  outputWeight: number
  /** Half-life in days for recency decay; `0` disables recency (multiplier 1). */
  recencyHalfLifeDays: number
  /** When false, the search index uses raw tokens (rebuild after changing). */
  stemming: boolean
  fuzzy: boolean
  fuzzyMaxEdits: number
  fuzzyMinTokenLength: number
  /** Suggest alternate query when top score is below this (or no hits). */
  weakScoreThreshold: number
}

export const DEFAULT_SEARCH_TUNING: SearchTuningConfig = {
  fieldWeights: { title: 2.5, body: 1, tags: 1.5 },
  outputWeight: 0.75,
  recencyHalfLifeDays: 180,
  stemming: true,
  fuzzy: true,
  fuzzyMaxEdits: 2,
  fuzzyMinTokenLength: 3,
  weakScoreThreshold: 0.001,
}

export interface KbConfig {
  name: string
  created: string
  provider: Provider
  model: string
  models?: ModelConfig
  localModelPricing?: LocalModelPricingConfig
  compileConcurrency: number
  conceptSummaryChars: number
  conceptMin: number
  conceptMax: number
  search: SearchTuningConfig
  /** Max bytes for audio, images, and non-video media ingest */
  mediaMaxFileBytes?: number
  /** Max bytes for video files (local + URL video/*); default 100 MiB */
  videoMaxFileBytes?: number
  /** Target frame density for video vision (see media-ffmpeg frame schedule) */
  videoFramesPerMinute?: number
  videoMinFrames?: number
  videoMaxFrames?: number
  videoFrameVisionMaxEdgePx?: number
  videoFrameJpegQuality?: number
  compileMediaTranscriptMaxChars?: number
  whisperPreprocessAudio?: boolean
  whisperAudioTargetSampleRateHz?: number
  whisperAudioMono?: boolean
}

const OPENAI_ACTION_MODELS: ModelConfig = {
  default: 'gpt-4o',
  compile: 'gpt-4o-mini',
  vision: 'gpt-4o',
  concepts: 'gpt-4o-mini',
  ask: 'gpt-4o',
  rank: 'gpt-4o-mini',
  chart: 'gpt-4o',
  slides: 'gpt-4o',
  lint: 'gpt-4o-mini',
  transcribe: 'whisper-1',
}

function createSingleModelActionConfig(model: string): ModelConfig {
  return {
    default: model,
    compile: model,
    vision: model,
    concepts: model,
    ask: model,
    slides: model,
    chart: model,
    lint: model,
    rank: model,
    transcribe: 'whisper-1',
  }
}

export function getDefaultActionModels(
  provider: Provider,
  model: string = DEFAULT_MODELS[provider],
): ModelConfig {
  if (provider === 'openai') {
    return { ...OPENAI_ACTION_MODELS }
  }
  return createSingleModelActionConfig(model)
}

export const DEFAULT_ACTION_MODELS: ModelConfig = getDefaultActionModels('openai')

const DEFAULT_LOCAL_MODEL_PRICING: LocalModelPricingConfig = {
  mode: 'duration',
  powerWatts: 250,
  electricityUsdPerKwh: 0.15,
  hardwareUsdPerHour: 0.35,
}

export function getDefaultLocalModelPricing(): LocalModelPricingConfig {
  return JSON.parse(JSON.stringify(DEFAULT_LOCAL_MODEL_PRICING)) as LocalModelPricingConfig
}

/** Defaults for audio/video ingest and compile (merged in readConfig) */
export const DEFAULT_MEDIA_CONFIG: Pick<
  KbConfig,
  | 'mediaMaxFileBytes'
  | 'videoMaxFileBytes'
  | 'videoFramesPerMinute'
  | 'videoMinFrames'
  | 'videoMaxFrames'
  | 'videoFrameVisionMaxEdgePx'
  | 'videoFrameJpegQuality'
  | 'compileMediaTranscriptMaxChars'
  | 'whisperPreprocessAudio'
  | 'whisperAudioTargetSampleRateHz'
  | 'whisperAudioMono'
> = {
  mediaMaxFileBytes: 50 * 1024 * 1024,
  videoMaxFileBytes: 100 * 1024 * 1024,
  videoFramesPerMinute: 12,
  videoMinFrames: 2,
  videoMaxFrames: 24,
  videoFrameVisionMaxEdgePx: 768,
  videoFrameJpegQuality: 6,
  compileMediaTranscriptMaxChars: 50000,
  whisperPreprocessAudio: true,
  whisperAudioTargetSampleRateHz: 16000,
  whisperAudioMono: true,
}

function mergeSearch(raw: unknown): SearchTuningConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SEARCH_TUNING, fieldWeights: { ...DEFAULT_SEARCH_TUNING.fieldWeights } }
  }
  const r = raw as Record<string, unknown>
  const fw = r.fieldWeights && typeof r.fieldWeights === 'object' ? (r.fieldWeights as SearchFieldWeights) : {}
  return {
    ...DEFAULT_SEARCH_TUNING,
    ...r,
    fieldWeights: {
      ...DEFAULT_SEARCH_TUNING.fieldWeights,
      ...fw,
    },
  } as SearchTuningConfig
}

const DEFAULT_CONFIG: KbConfig = {
  name: 'knowledge-base',
  created: new Date().toISOString(),
  provider: 'openai',
  model: 'gpt-4o',
  models: getDefaultActionModels('openai'),
  localModelPricing: getDefaultLocalModelPricing(),
  compileConcurrency: 3,
  conceptSummaryChars: 3000,
  conceptMin: 5,
  conceptMax: 10,
  search: DEFAULT_SEARCH_TUNING,
  ...DEFAULT_MEDIA_CONFIG,
}

function mergeLocalModelPricing(
  rawPricing: Partial<LocalModelPricingConfig> | undefined,
): LocalModelPricingConfig {
  const defaults = getDefaultLocalModelPricing()
  return {
    ...defaults,
    ...rawPricing,
  }
}

export function readConfig(): KbConfig {
  return readConfigAtRoot(requireKbRoot())
}

export function readConfigAtRoot(root: string): KbConfig {
  const paths = kbPaths(root)
  if (!existsSync(paths.configFile)) {
    return DEFAULT_CONFIG
  }
  const raw = JSON.parse(readFileSync(paths.configFile, 'utf-8'))
  const provider = (raw.provider as Provider | undefined) ?? DEFAULT_CONFIG.provider
  const model = typeof raw.model === 'string' && raw.model.trim() ? raw.model : DEFAULT_MODELS[provider]
  const mergedModels = { ...getDefaultActionModels(provider, model), ...raw.models }
  const localModelPricing = mergeLocalModelPricing(raw.localModelPricing)
  const mediaMerged = { ...DEFAULT_MEDIA_CONFIG }
  for (const key of Object.keys(DEFAULT_MEDIA_CONFIG) as (keyof typeof DEFAULT_MEDIA_CONFIG)[]) {
    if (raw[key] !== undefined) (mediaMerged as Record<string, unknown>)[key] = raw[key]
  }
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    ...mediaMerged,
    models: mergedModels,
    localModelPricing,
    search: mergeSearch(raw.search),
  }
}

export function writeConfig(config: KbConfig): void {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  writeFileSync(paths.configFile, JSON.stringify(config, null, 2) + '\n')
}

/** Default display name for an unnamed knowledge base */
export const DEFAULT_KB_NAME = 'Knowledge Base'

/** Returns the display name for a knowledge base, falling back to DEFAULT_KB_NAME if unnamed */
export function getKbName(config: { name?: string }): string {
  return config.name ?? DEFAULT_KB_NAME
}
