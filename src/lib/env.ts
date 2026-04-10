import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
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
      return  // KB .env takes priority, don't load others
    }
  }

  const cwd = process.cwd()
  const cwdEnv = join(cwd, '.env')
  if (existsSync(cwdEnv)) {
    dotenv.config({ path: cwdEnv, quiet: true })
    return  // CWD .env takes priority over global
  }

  // Fall back to global .env
  const globalEnv = join(homedir(), '.theora', '.env')
  if (existsSync(globalEnv)) {
    dotenv.config({ path: globalEnv, quiet: true })
  }
}

export function getGlobalEnvPath(): string {
  return join(homedir(), '.theora', '.env')
}

export function globalEnvExists(): boolean {
  return existsSync(getGlobalEnvPath())
}

export function ensureGlobalEnvDir(): void {
  const globalDir = join(homedir(), '.theora')
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true })
  }
}

export function createGlobalEnv(): string {
  ensureGlobalEnvDir()
  const globalEnvPath = getGlobalEnvPath()

  const template = `# Theora — Global LLM API Keys
# This file is used as a fallback when no KB-specific .env exists
# KB .env files take priority over this global file

# OpenAI (default)
OPENAI_API_KEY=

# Anthropic
# ANTHROPIC_API_KEY=
`

  writeFileSync(globalEnvPath, template)
  return globalEnvPath
}
