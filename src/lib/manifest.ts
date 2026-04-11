import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { kbPaths, requireKbRoot } from './paths.js'

export interface ManifestEntry {
  name: string
  ingested: string
  tag: string | null
  url?: string
}

interface Manifest {
  files: ManifestEntry[]
}

function manifestPath(): string {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  return join(paths.raw, '.manifest.json')
}

let _manifestCache: ManifestEntry[] | null = null

export function readManifest(): ManifestEntry[] {
  if (_manifestCache) return _manifestCache
  const path = manifestPath()
  if (!existsSync(path)) return []
  const data: Manifest = JSON.parse(readFileSync(path, 'utf-8'))
  _manifestCache = data.files ?? []
  return _manifestCache
}

export function writeManifest(entries: ManifestEntry[]): void {
  const path = manifestPath()
  writeFileSync(path, JSON.stringify({ files: entries }, null, 2) + '\n')
  _manifestCache = null
}

export function getTagForFile(fileName: string): string | null {
  const entries = readManifest()
  return entries.find(e => e.name === fileName)?.tag ?? null
}
