import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { runCompile } from '../lib/compile/index.js'

export const compileCommand = new Command('compile')
  .description('Compile raw sources into the wiki')
  .option('--source <raw-file>', 'compile one raw source and rebuild the index')
  .option('--sources-only', 'only compile source summaries, skip concepts')
  .option('--concepts-only', 'delete and regenerate all concept articles from existing sources')
  .option('--reindex', 'only rebuild the index')
  .option('--force', 'delete existing wiki articles and recompile everything from scratch')
  .option('--concurrency <n>', 'parallel LLM calls during compile (overrides config)')
  .action(async (options: {
    source?: string
    sourcesOnly?: boolean
    conceptsOnly?: boolean
    reindex?: boolean
    force?: boolean
    concurrency?: string
  }) => {
    if (options.source && options.force) {
      throw new Error('--source cannot be used with --force')
    }
    if (options.source && options.conceptsOnly) {
      throw new Error('--source cannot be used with --concepts-only')
    }
    if (options.source && options.reindex) {
      throw new Error('--source cannot be used with --reindex')
    }

    const root = requireKbRoot()
    const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : undefined

    await runCompile(root, {
      source: options.source,
      force: options.force,
      sourcesOnly: options.sourcesOnly,
      conceptsOnly: options.conceptsOnly,
      reindex: options.reindex,
      concurrency,
    })

    if (!options.reindex) {
      console.log()
      if (options.source) {
        console.log(`${pc.green('Compiled source:')} ${pc.cyan(options.source)}. Run ${pc.cyan('theora ask <question>')} to query the wiki.`)
      } else {
        console.log(`${pc.green('Compilation complete.')} Run ${pc.cyan('theora ask <question>')} to query the wiki.`)
      }
    }
  })
