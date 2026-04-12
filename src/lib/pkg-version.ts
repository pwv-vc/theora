import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

let cached: string | undefined

/** Resolves package.json by walking up from this module (works in src/ and dist/). */
export function getPkgVersion(): string {
  if (cached !== undefined) return cached
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, 'package.json')
    if (existsSync(candidate)) {
      try {
        const v = JSON.parse(readFileSync(candidate, 'utf-8'))?.version
        if (typeof v === 'string' && v.length > 0) {
          cached = v
          return v
        }
      } catch {
        // keep walking
      }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  cached = '0.0.0'
  return cached
}
