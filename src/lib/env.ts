import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { findKbRoot } from './paths.js'

let loaded = false

function loadReadableEnvFile(path: string): void {
  if (!existsSync(path)) return

  try {
    accessSync(path, constants.R_OK)
  } catch {
    return
  }

  dotenv.config({ path, quiet: true, override: true })
}

export function loadEnv(): void {
  if (loaded) return
  loaded = true

  const globalEnv = join(homedir(), '.theora', '.env')
  loadReadableEnvFile(globalEnv)

  const cwd = process.cwd()
  const cwdEnv = join(cwd, '.env')
  loadReadableEnvFile(cwdEnv)

  const root = findKbRoot()
  if (root) {
    const kbEnvPath = join(root, '.env')
    loadReadableEnvFile(kbEnvPath)
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

# OpenAI-compatible
# OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
# OPENAI_COMPATIBLE_API_KEY=

# Anthropic
# ANTHROPIC_API_KEY=
`

  writeFileSync(globalEnvPath, template)
  return globalEnvPath
}
