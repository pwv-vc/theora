import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export interface KnownKb {
  name: string
  path: string
}

export interface GlobalConfig {
  activeKb?: string
  knownKbs?: KnownKb[]
}

function getUserHomeDir(): string {
  return process.env.HOME?.trim() ? resolve(process.env.HOME) : resolve(homedir())
}

export function getGlobalConfigDir(): string {
  return join(getUserHomeDir(), '.theora')
}

export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), 'config.json')
}

export function globalConfigExists(): boolean {
  return existsSync(getGlobalConfigPath())
}

export function ensureGlobalConfigDir(): void {
  const globalDir = getGlobalConfigDir()
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true })
  }
}

function sanitizeKnownKbs(value: unknown): KnownKb[] {
  if (!Array.isArray(value)) return []

  const knownKbs: KnownKb[] = []
  const seenPaths = new Set<string>()

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue

    const name = 'name' in entry && typeof entry.name === 'string' ? entry.name.trim() : ''
    const path = 'path' in entry && typeof entry.path === 'string' ? entry.path.trim() : ''

    if (!name || !path) continue

    const resolvedPath = resolve(path)
    if (seenPaths.has(resolvedPath)) continue

    seenPaths.add(resolvedPath)
    knownKbs.push({ name, path: resolvedPath })
  }

  return knownKbs
}

export function readGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath()
  if (!existsSync(configPath)) {
    return { knownKbs: [] }
  }

  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as GlobalConfig
  const knownKbs = sanitizeKnownKbs(raw.knownKbs)
  const activeKb = typeof raw.activeKb === 'string' && raw.activeKb.trim()
    ? resolve(raw.activeKb)
    : undefined

  return { activeKb, knownKbs }
}

export function writeGlobalConfig(config: GlobalConfig): void {
  ensureGlobalConfigDir()
  const configPath = getGlobalConfigPath()
  const knownKbs = sanitizeKnownKbs(config.knownKbs)
  const nextConfig: GlobalConfig = {
    ...(config.activeKb ? { activeKb: resolve(config.activeKb) } : {}),
    ...(knownKbs.length > 0 ? { knownKbs } : { knownKbs: [] }),
  }

  writeFileSync(configPath, JSON.stringify(nextConfig, null, 2) + '\n')
}
