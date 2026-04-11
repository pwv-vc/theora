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
}

export interface LocalModelPricingConfig {
  mode: 'duration' | 'zero'
  powerWatts: number
  electricityUsdPerKwh: number
  hardwareUsdPerHour: number
}

export type ContextCompressionProvider =
  | 'none'
  | 'token-company'
  | 'caveman-nlp'
  | 'caveman-mlm'
  | 'caveman-llm'

export interface ContextCompressionCavemanConfig {
  /** Absolute path to a clone of https://github.com/wilpel/caveman-compression */
  root: string
  /** NLP variant: spaCy language code (e.g. en, es) */
  language?: string
  /** MLM variant: top-k predictability threshold */
  mlmK?: number
}

export interface ContextCompressionTokenCompanyConfig {
  model?: string
  aggressiveness?: number
}

export interface ContextCompressionConfig {
  provider?: ContextCompressionProvider
  /** Skip compression when input is shorter than this (Unicode code units). Default 4096. */
  minChars?: number
  /** Run the same compressor on Whisper transcript text before returning. Default false. */
  applyToTranscripts?: boolean
  caveman?: ContextCompressionCavemanConfig
  tokenCompany?: ContextCompressionTokenCompanyConfig
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
  /** Optional user-message / transcript compression before LLM or after Whisper */
  contextCompression?: ContextCompressionConfig
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
  const root = requireKbRoot()
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
  return { ...DEFAULT_CONFIG, ...raw, ...mediaMerged, models: mergedModels, localModelPricing }
}

export function writeConfig(config: KbConfig): void {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  writeFileSync(paths.configFile, JSON.stringify(config, null, 2) + '\n')
}
