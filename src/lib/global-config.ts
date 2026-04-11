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

function normalizeKbName(name: string): string {
  return name.trim().toLowerCase()
}

export function hasConflictingKbName(
  config: GlobalConfig,
  candidate: KnownKb,
): KnownKb | null {
  const candidateName = normalizeKbName(candidate.name)

  return (config.knownKbs ?? []).find((entry) =>
    entry.path !== candidate.path && normalizeKbName(entry.name) === candidateName,
  ) ?? null
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

export function findKnownKbByPath(config: GlobalConfig, inputPath: string): KnownKb | null {
  const resolvedPath = resolve(inputPath)
  return (config.knownKbs ?? []).find((entry) => entry.path === resolvedPath) ?? null
}

export function findKnownKbByName(config: GlobalConfig, name: string): KnownKb | null {
  const matches = (config.knownKbs ?? [])
    .filter((entry) => normalizeKbName(entry.name) === normalizeKbName(name))

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  const paths = matches.map((entry) => entry.path).join(', ')
  throw new Error(`Saved KB name is ambiguous: "${name}". Matching paths: ${paths}`)
}

export function removeKnownKb(config: GlobalConfig, reference: string): GlobalConfig {
  const byPath = findKnownKbByPath(config, reference)
  const target = byPath ?? findKnownKbByName(config, reference)

  if (!target) {
    throw new Error(`Saved KB not found: "${reference}"`)
  }

  const knownKbs = (config.knownKbs ?? []).filter((entry) => entry.path !== target.path)
  const activeKb = config.activeKb === target.path ? undefined : config.activeKb

  return {
    activeKb,
    knownKbs,
  }
}
