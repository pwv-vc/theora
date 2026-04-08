import { Command } from 'commander'
import { rmSync, existsSync } from 'node:fs'
import pc from 'picocolors'
import { requireKbRoot, kbPaths } from '../lib/paths.js'
import { compileSources, extractConcepts, rebuildIndex } from '../lib/compiler.js'

export const compileCommand = new Command('compile')
  .description('Compile raw sources into the wiki')
  .option('--sources-only', 'only compile source summaries, skip concepts')
  .option('--concepts-only', 'delete and regenerate all concept articles from existing sources')
  .option('--reindex', 'only rebuild the index')
  .option('--force', 'delete existing wiki articles and recompile everything from scratch')
  .option('--concurrency <n>', 'parallel LLM calls during compile (overrides config)')
  .action(async (options: { sourcesOnly?: boolean; conceptsOnly?: boolean; reindex?: boolean; force?: boolean; concurrency?: string }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : undefined

    if (options.reindex) {
      await rebuildIndex(root)
      return
    }

    if (options.conceptsOnly) {
      if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
      console.log(pc.gray('Cleared existing concepts — regenerating from compiled sources'))
      await extractConcepts(root, concurrency)
      await rebuildIndex(root)
      console.log()
      console.log(`${pc.green('Compilation complete.')} Run ${pc.cyan('theora ask <question>')} to query the wiki.`)
      return
    }

    if (options.force) {
      if (existsSync(paths.wikiSources)) rmSync(paths.wikiSources, { recursive: true, force: true })
      if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
      console.log(pc.gray('Cleared existing wiki articles — recompiling from scratch'))
    }

    await compileSources(root, concurrency)

    if (!options.sourcesOnly) {
      await extractConcepts(root, concurrency)
    }

    await rebuildIndex(root)

    console.log()
    console.log(`${pc.green('Compilation complete.')} Run ${pc.cyan('theora ask <question>')} to query the wiki.`)
  })
