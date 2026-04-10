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
}

export interface KbConfig {
  name: string
  created: string
  provider: Provider
  model: string
  models?: ModelConfig
  compileConcurrency: number
  conceptSummaryChars: number
  conceptMin: number
  conceptMax: number
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

const DEFAULT_CONFIG: KbConfig = {
  name: 'knowledge-base',
  created: new Date().toISOString(),
  provider: 'openai',
  model: 'gpt-4o',
  models: getDefaultActionModels('openai'),
  compileConcurrency: 3,
  conceptSummaryChars: 3000,
  conceptMin: 5,
  conceptMax: 10,
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
  return { ...DEFAULT_CONFIG, ...raw, models: mergedModels }
}

export function writeConfig(config: KbConfig): void {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  writeFileSync(paths.configFile, JSON.stringify(config, null, 2) + '\n')
}
