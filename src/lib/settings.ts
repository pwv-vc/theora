import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { findKbRoot } from './paths.js'
import { readConfig, KbConfig } from './config.js'
import { getGlobalEnvPath, globalEnvExists } from './env.js'

export interface EnvLocation {
  source: 'kb' | 'cwd' | 'global' | 'none'
  path: string | null
  exists: boolean
}

export interface SettingsInfo {
  kbConfig: KbConfig | null
  kbRoot: string | null
  envLocation: EnvLocation
  envKeys: string[]
  globalEnvExists: boolean
  globalEnvPath: string
}

export function findActiveEnvFile(): EnvLocation {
  const kbRoot = findKbRoot()
  const cwd = process.cwd()

  // Check KB root first (highest priority)
  if (kbRoot) {
    const kbEnvPath = join(kbRoot, '.env')
    if (existsSync(kbEnvPath)) {
      return { source: 'kb', path: kbEnvPath, exists: true }
    }
  }

  // Check CWD second
  const cwdEnvPath = join(cwd, '.env')
  if (existsSync(cwdEnvPath)) {
    return { source: 'cwd', path: cwdEnvPath, exists: true }
  }

  // Check global last
  const globalPath = getGlobalEnvPath()
  if (existsSync(globalPath)) {
    return { source: 'global', path: globalPath, exists: true }
  }

  return { source: 'none', path: null, exists: false }
}

export function getEnvKeysFromFile(envPath: string): string[] {
  const keys: string[] = []
  if (!existsSync(envPath)) return keys

  const content = readFileSync(envPath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Match KEY=VALUE or KEY= (empty value), skip comments
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match && !trimmed.startsWith('#')) {
      keys.push(match[1])
    }
  }

  return keys
}

export function getAllEnvKeys(): string[] {
  const keys = new Set<string>()
  const kbRoot = findKbRoot()

  // Check all potential sources in priority order
  const sources: string[] = []

  if (kbRoot) {
    sources.push(join(kbRoot, '.env'))
  }
  sources.push(join(process.cwd(), '.env'))
  sources.push(getGlobalEnvPath())

  for (const envPath of sources) {
    const fileKeys = getEnvKeysFromFile(envPath)
    for (const key of fileKeys) {
      keys.add(key)
    }
  }

  return Array.from(keys).sort()
}

export function getSettingsInfo(): SettingsInfo {
  const kbRoot = findKbRoot()
  const kbConfig = kbRoot ? readConfig() : null
  const envLocation = findActiveEnvFile()

  return {
    kbConfig,
    kbRoot,
    envLocation,
    envKeys: getAllEnvKeys(),
    globalEnvExists: globalEnvExists(),
    globalEnvPath: getGlobalEnvPath()
  }
}
