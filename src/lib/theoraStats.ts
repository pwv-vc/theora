import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { requireKbRoot } from './paths.js'

export function readTheoraStatsJson(): Record<string, unknown> | null {
  const root = requireKbRoot()
  const statsPath = join(root, '.theora', 'stats.json')
  if (!existsSync(statsPath)) return null
  return JSON.parse(readFileSync(statsPath, 'utf-8')) as Record<string, unknown>
}
