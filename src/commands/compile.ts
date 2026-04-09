import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { runCompile } from '../lib/compile.js'

export const compileCommand = new Command('compile')
  .description('Compile raw sources into the wiki')
  .option('--sources-only', 'only compile source summaries, skip concepts')
  .option('--concepts-only', 'delete and regenerate all concept articles from existing sources')
  .option('--reindex', 'only rebuild the index')
  .option('--force', 'delete existing wiki articles and recompile everything from scratch')
  .option('--concurrency <n>', 'parallel LLM calls during compile (overrides config)')
  .action(async (options: { sourcesOnly?: boolean; conceptsOnly?: boolean; reindex?: boolean; force?: boolean; concurrency?: string }) => {
    const root = requireKbRoot()
    const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : undefined

    await runCompile(root, {
      force: options.force,
      sourcesOnly: options.sourcesOnly,
      conceptsOnly: options.conceptsOnly,
      reindex: options.reindex,
      concurrency,
    })

    if (!options.reindex) {
      console.log()
      console.log(`${pc.green('Compilation complete.')} Run ${pc.cyan('theora ask <question>')} to query the wiki.`)
    }
  })
