import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

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

export function isKbRoot(dir: string): boolean {
  return existsSync(join(dir, '.theora', 'config.json'))
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

export function requireKbRoot(): string {
  const root = findKbRoot()
  if (!root) {
    throw new Error('Not inside a knowledge base. Run `theora init` first.')
  }
  return root
}

export function getGlobalTheoraDir(): string {
  return join(homedir(), '.theora')
}

export function getGlobalEnvPath(): string {
  return join(getGlobalTheoraDir(), '.env')
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
