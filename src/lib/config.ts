import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { kbPaths, requireKbRoot } from './paths.js'
import type { Provider } from './types.js'

export interface KbConfig {
  name: string
  created: string
  provider: Provider
  model: string
  compileConcurrency: number
  conceptSummaryChars: number
  conceptMin: number
  conceptMax: number
}

const DEFAULT_CONFIG: KbConfig = {
  name: 'knowledge-base',
  created: new Date().toISOString(),
  provider: 'openai',
  model: 'gpt-4o',
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
  return { ...DEFAULT_CONFIG, ...raw }
}

export function writeConfig(config: KbConfig): void {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  writeFileSync(paths.configFile, JSON.stringify(config, null, 2) + '\n')
}
