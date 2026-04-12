import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { readGlobalConfig } from './global-config.js'

/**
 * Join `base` and `untrusted` and verify the result stays inside `base`.
 * Throws if the resolved path escapes the base directory.
 */
export function safeJoin(base: string, untrusted: string): string {
  const resolvedBase = resolve(base)
  const resolved = resolve(base, untrusted)
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + '/')) {
    throw new Error(`Path traversal detected: "${untrusted}" escapes base directory`)
  }
  return resolved
}

export type KbResolutionSource = 'cwd' | 'global' | 'none'

export interface KbResolution {
  root: string | null
  source: KbResolutionSource
  invalidGlobalKb: string | null
}

export function isKbRoot(path: string): boolean {
  const root = resolve(path)
  return existsSync(join(root, '.theora', 'config.json'))
    && existsSync(join(root, 'raw'))
    && existsSync(join(root, 'wiki'))
    && existsSync(join(root, 'output'))
}

export function findKbRoot(from: string = process.cwd()): string | null {
  let dir = resolve(from)
  while (true) {
    if (isKbRoot(dir)) {
      return dir
    }
    const parent = resolve(dir, '..')
    if (parent === dir) return null
    dir = parent
  }
}

export function resolveKbRoot(from: string = process.cwd()): KbResolution {
  const localRoot = findKbRoot(from)
  if (localRoot) {
    return { root: localRoot, source: 'cwd', invalidGlobalKb: null }
  }

  const { activeKb } = readGlobalConfig()
  if (!activeKb) {
    return { root: null, source: 'none', invalidGlobalKb: null }
  }

  const resolvedActiveKb = resolve(activeKb)
  if (!isKbRoot(resolvedActiveKb)) {
    return { root: null, source: 'none', invalidGlobalKb: resolvedActiveKb }
  }

  return { root: resolvedActiveKb, source: 'global', invalidGlobalKb: null }
}

export function findActiveKbRoot(from: string = process.cwd()): string | null {
  return resolveKbRoot(from).root
}

export function requireKbRoot(): string {
  const resolution = resolveKbRoot()
  if (resolution.root) {
    return resolution.root
  }

  if (resolution.invalidGlobalKb) {
    throw new Error(
      `Configured active KB is invalid: "${resolution.invalidGlobalKb}". Run \`theora kb use <path>\` to set a valid knowledge base.`,
    )
  }

  throw new Error('Not inside a knowledge base and no active KB is configured. Run `theora kb use <path>` first.')
}

export type KbPaths = ReturnType<typeof kbPaths>

export function kbPaths(root: string) {
  return {
    root,
    raw: join(root, 'raw'),
    wiki: join(root, 'wiki'),
    wikiIndex: join(root, 'wiki', 'index.md'),
    wikiConcepts: join(root, 'wiki', 'concepts'),
    wikiSources: join(root, 'wiki', 'sources'),
    output: join(root, 'output'),
    config: join(root, '.theora'),
    configFile: join(root, '.theora', 'config.json'),
    theme: join(root, '.theora', 'theme.css'),
    llmLog: join(root, '.theora', 'llm-calls.jsonl'),
  }
}
