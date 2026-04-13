import { rmSync, existsSync } from 'node:fs'
import { kbPaths } from '../paths.js'
import { compileSources, compileTargetedSource, extractConcepts, rebuildIndex } from './wiki-compiler.js'

export interface CompileOptions {
  source?: string
  force?: boolean
  sourcesOnly?: boolean
  conceptsOnly?: boolean
  reindex?: boolean
  concurrency?: number
}

export async function runCompile(
  root: string,
  options: CompileOptions = {},
  onProgress?: (msg: string) => void,
): Promise<void> {
  const paths = kbPaths(root)

  if (options.source) {
    if (options.force) throw new Error('--source cannot be used with --force')
    if (options.conceptsOnly) throw new Error('--source cannot be used with --concepts-only')
    if (options.reindex) throw new Error('--source cannot be used with --reindex')

    await compileTargetedSource(root, options.source, onProgress)
    await rebuildIndex(root, onProgress)
    return
  }

  if (options.reindex) {
    await rebuildIndex(root, onProgress)
    return
  }

  if (options.force) {
    if (existsSync(paths.wikiSources)) rmSync(paths.wikiSources, { recursive: true, force: true })
    if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
    onProgress?.('Cleared existing wiki articles — recompiling from scratch')
  }

  if (options.conceptsOnly) {
    if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
    onProgress?.('Cleared existing concepts — regenerating from compiled sources')
    await extractConcepts(root, options.concurrency, onProgress)
    await rebuildIndex(root, onProgress)
    return
  }

  await compileSources(root, options.concurrency, onProgress)

  if (!options.sourcesOnly) {
    await extractConcepts(root, options.concurrency, onProgress)
  }

  await rebuildIndex(root, onProgress)
}
