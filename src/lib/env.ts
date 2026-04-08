import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { findKbRoot } from './paths.js'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true

  const root = findKbRoot()
  if (root) {
    const envPath = join(root, '.env')
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true })
    }
  }

  const cwd = process.cwd()
  const cwdEnv = join(cwd, '.env')
  if (existsSync(cwdEnv)) {
    dotenv.config({ path: cwdEnv, quiet: true })
  }
}
