import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { findKbRoot, getGlobalEnvPath } from './paths.js'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true

  const globalEnvPath = getGlobalEnvPath()
  if (existsSync(globalEnvPath)) {
    dotenv.config({ path: globalEnvPath, quiet: true })
  }

  const root = findKbRoot()
  if (root) {
    const envPath = join(root, '.env')
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true, override: true })
    }
  }

  const cwd = process.cwd()
  const cwdEnv = join(cwd, '.env')
  if (existsSync(cwdEnv)) {
    dotenv.config({ path: cwdEnv, quiet: true, override: true })
  }
}
