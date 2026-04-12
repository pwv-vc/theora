import { join } from 'node:path'
import { existsSync, readFileSync, accessSync, constants } from 'node:fs'
import { readConfigAtRoot, KbConfig } from './config.js'
import { getGlobalEnvPath, globalEnvExists } from './env.js'
import { getGlobalConfigPath, globalConfigExists, readGlobalConfig } from './global-config.js'
import { resolveKbRoot, type KbResolutionSource } from './paths.js'

export interface EnvLocation {
  source: 'kb' | 'cwd' | 'global' | 'none'
  path: string | null
  exists: boolean
}

export interface SettingsInfo {
  kbConfig: KbConfig | null
  kbRoot: string | null
  kbResolutionSource: KbResolutionSource
  envLocation: EnvLocation
  envKeys: string[]
  globalConfigExists: boolean
  globalConfigPath: string
  activeKb: string | null
  knownKbsCount: number
  globalEnvExists: boolean
  globalEnvPath: string
}

function debugFileAccessIssue(path: string, error: unknown): void {
  if (process.env.THEORA_DEBUG !== '1') return

  const detail = error instanceof Error ? error.message : String(error)
  console.warn(`[settings] cannot access ${path}: ${detail}`)
}

function isReadableFile(path: string): boolean {
  if (!existsSync(path)) return false

  try {
    accessSync(path, constants.R_OK)
    return true
  } catch (error) {
    debugFileAccessIssue(path, error)
    return false
  }
}

export function findActiveEnvFile(): EnvLocation {
  const kbRoot = resolveKbRoot().root
  const cwd = process.cwd()

  // Check KB root first (highest priority)
  if (kbRoot) {
    const kbEnvPath = join(kbRoot, '.env')
    if (isReadableFile(kbEnvPath)) {
      return { source: 'kb', path: kbEnvPath, exists: true }
    }
  }

  // Check CWD second
  const cwdEnvPath = join(cwd, '.env')
  if (isReadableFile(cwdEnvPath)) {
    return { source: 'cwd', path: cwdEnvPath, exists: true }
  }

  // Check global last
  const globalPath = getGlobalEnvPath()
  if (isReadableFile(globalPath)) {
    return { source: 'global', path: globalPath, exists: true }
  }

  return { source: 'none', path: null, exists: false }
}

export function getEnvKeysFromFile(envPath: string): string[] {
  const keys: string[] = []
  if (!isReadableFile(envPath)) return keys

  let content: string
  try {
    content = readFileSync(envPath, 'utf-8')
  } catch {
    return keys
  }
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
  const kbRoot = resolveKbRoot().root

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
  const resolution = resolveKbRoot()
  const kbRoot = resolution.root
  const kbConfig = kbRoot ? readConfigAtRoot(kbRoot) : null
  const envLocation = findActiveEnvFile()
  const globalConfig = readGlobalConfig()

  return {
    kbConfig,
    kbRoot,
    kbResolutionSource: resolution.source,
    envLocation,
    envKeys: getAllEnvKeys(),
    globalConfigExists: globalConfigExists(),
    globalConfigPath: getGlobalConfigPath(),
    activeKb: globalConfig.activeKb ?? null,
    knownKbsCount: globalConfig.knownKbs?.length ?? 0,
    globalEnvExists: globalEnvExists(),
    globalEnvPath: getGlobalEnvPath(),
  }
}
