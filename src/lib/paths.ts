import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

export function findKbRoot(from: string = process.cwd()): string | null {
  let dir = resolve(from)
  while (true) {
    if (existsSync(join(dir, '.theora'))) {
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
  }
}
