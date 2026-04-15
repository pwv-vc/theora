import { Command } from 'commander'
import { existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join, resolve, extname } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot, safeJoin } from '../lib/paths.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { VALID_EXTS, ingestLocalFile, ingestUrlSource, isUrl, isValidFile } from '../lib/ingest.js'
import { normalizeYouTubeInput } from '../lib/youtube.js'
import { bulkIngest, isZipFile, importFromZip, type BulkIngestResult } from '../lib/bulk-ingest.js'
import { runCompile } from '../lib/compile/index.js'
import {
  createIngestStats,
  displayIngestStats,
  recordFileProcessed,
  finalizeStats,
  createCompileStats,
  displayCompileStats,
  type IngestStats,
  type CompileStats,
} from '../lib/stats.js'

function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...collectFiles(full))
    else if (isValidFile(full)) results.push(full)
  }
  return results
}

export const ingestCommand = new Command('ingest')
  .description('Add source documents to the knowledge base')
  .argument('[sources...]', 'files, directories, or URLs to ingest')
  .option('--tag <tag>', 'tag to categorize the source')
  .option('--from <file>', 'ingest from export zip or KB JSON file (use - for stdin)')
  .option('--compile', 'compile the wiki after ingestion completes')
  .option('--no-stats', 'suppress stats output (useful for piping)')
  .action(async (sources: string[], options: { tag?: string; from?: string; compile?: boolean; stats?: boolean }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    if (options.tag && !/^[a-z0-9][a-z0-9-]*$/.test(options.tag)) {
      console.error(pc.red(`Invalid tag "${options.tag}" — use lowercase letters, numbers, and hyphens only`))
      process.exit(1)
    }

    // Validation: must have either sources or --from, not both
    const hasSources = sources && sources.length > 0
    const hasFrom = Boolean(options.from)

    if (hasSources && hasFrom) {
      console.error(pc.red('Cannot use --from with positional sources. Use one or the other.'))
      process.exit(1)
    }

    if (!hasSources && !hasFrom) {
      console.error(pc.red('No sources specified. Provide sources as arguments or use --from <file>.'))
      process.exit(1)
    }

    const destDir = options.tag ? safeJoin(paths.raw, options.tag) : paths.raw
    mkdirSync(destDir, { recursive: true })

    const entries = readManifest()
    const existingNames = new Set(entries.map(e => e.name))
    const existingUrls = new Set(entries.flatMap(e => e.url ? [e.url] : []))

    const stats = createIngestStats()

    // Handle bulk ingest from file (including zip archives)
    if (hasFrom) {
      const fromPath = options.from!

      // Check if it's a zip file
      if (isZipFile(fromPath)) {
        const spinner = ora(`Importing from zip archive: ${fromPath}`).start()
        try {
          const result = await importFromZip(
            fromPath,
            destDir,
            existingNames,
            existingUrls,
            options.tag,
          )

          // Update manifest with results
          for (const r of result.results) {
            if (r.status === 'ingested') {
              entries.push({
                name: r.name,
                ingested: new Date().toISOString(),
                tag: options.tag ?? null,
                url: r.url,
              })
              // Track by file extension
              const ext = r.name.split('.').pop()?.toLowerCase() || 'unknown'
              recordFileProcessed(stats, ext, 0, true)
            }
          }

          writeManifest(entries)
          spinner.succeed(`Imported from zip archive`)

          // Display basic stats
          const parts = [`Ingested ${result.stats.ingested} file${result.stats.ingested !== 1 ? 's' : ''}`]
          if (result.stats.skippedDupe > 0) parts.push(`${result.stats.skippedDupe} skipped (already ingested)`)
          if (result.stats.errors > 0) parts.push(`${result.stats.errors} failed`)
          console.log(pc.green('✓') + ' ' + parts.join(', '))
        } catch (err) {
          spinner.fail(`Failed to import from zip: ${err instanceof Error ? err.message : String(err)}`)
          process.exit(1)
        }
      } else {
        // Regular file (JSON or text)
        const result = await bulkIngest({
          filePath: fromPath,
          destDir,
          existingNames,
          existingUrls,
          tag: options.tag,
        })

        // Update manifest with results
        for (const r of result.results) {
          if (r.status === 'ingested' && r.url) {
            entries.push({
              name: r.name,
              ingested: new Date().toISOString(),
              tag: options.tag ?? null,
              url: r.url,
            })
            // Track by file extension
            const ext = r.name.split('.').pop()?.toLowerCase() || 'unknown'
            recordFileProcessed(stats, ext, 0, true)
          }
        }

        writeManifest(entries)

        // Display basic stats
        const parts = [`Ingested ${result.stats.ingested} file${result.stats.ingested !== 1 ? 's' : ''}`]
        if (result.stats.skippedDupe > 0) parts.push(`${result.stats.skippedDupe} skipped (already ingested)`)
        if (result.stats.errors > 0) parts.push(`${result.stats.errors} failed`)
        console.log(pc.green('✓') + ' ' + parts.join(', '))
      }

      // Finalize and display detailed stats
      finalizeStats(stats)
      if (options.stats !== false) {
        console.log(displayIngestStats(stats, VALID_EXTS))
      }

      // Handle --compile flag after bulk ingest operations
      if (options.compile) {
        console.log()
        const compileStats = createCompileStats()
        const spinner = ora('Compiling wiki...').start()
        try {
          await runCompile(root, {}, (msg) => {
            spinner.text = msg
          }, compileStats)
          spinner.succeed('Compilation complete')
          // Add newline before stats for better separation
          if (options.stats !== false) {
            const statsOutput = displayCompileStats(compileStats)
            if (statsOutput.trim()) {
              console.log(statsOutput)
            }
          }
          console.log(`Run ${pc.cyan('theora ask <question>')} to query the wiki`)
        } catch (err) {
          spinner.fail(`Compilation failed: ${err instanceof Error ? err.message : String(err)}`)
          process.exit(1)
        }
      } else {
        console.log(`Next: ${pc.cyan('theora compile')} to build the wiki`)
      }
      return
    }

    let ingested = 0, skippedType = 0, skippedDupe = 0, skippedSize = 0

    for (const source of sources) {
      const normalizedYouTubeSource = normalizeYouTubeInput(source)
      const remoteSource = normalizedYouTubeSource ?? (isUrl(source) ? source : null)

      if (remoteSource) {
        const spinner = ora(`Fetching: ${source}`).start()
        const fetchStartTime = Date.now()
        const result = await ingestUrlSource(remoteSource, destDir, existingNames, existingUrls)
        const fetchTimeMs = Date.now() - fetchStartTime
        if (result.status === 'ingested') {
          entries.push({
            name: result.name,
            ingested: new Date().toISOString(),
            tag: options.tag ?? null,
            url: result.url ?? remoteSource,
          })
          ingested++
          // Track by URL type
          const urlType = result.url?.includes('youtube') ? 'youtube' : 'url'
          recordFileProcessed(stats, urlType, fetchTimeMs, true)
          spinner.succeed(`Fetched: ${result.name}`)
        } else if (result.status === 'skipped_dupe') {
          skippedDupe++
          recordFileProcessed(stats, 'skipped', 0, false)
          spinner.warn(`Already ingested: ${result.name}`)
        } else {
          recordFileProcessed(stats, 'error', fetchTimeMs, false)
          spinner.fail(`Failed to fetch ${source}: ${result.error ?? 'Unknown error'}`)
        }
        continue
      }

      const src = resolve(source)
      if (!existsSync(src)) {
        console.log(pc.yellow(`Not found: ${source}`))
        continue
      }

      const filesToIngest = statSync(src).isDirectory() ? collectFiles(src) : [src]
      const sourceRoot = statSync(src).isDirectory() ? src : undefined

      for (const file of filesToIngest) {
        const fileStartTime = Date.now()
        const result = ingestLocalFile(file, destDir, existingNames, sourceRoot)
        const fileTimeMs = Date.now() - fileStartTime
        const ext = extname(file).toLowerCase().slice(1) || 'unknown'

        if (result.status === 'ingested') {
          entries.push({ name: result.name, ingested: new Date().toISOString(), tag: options.tag ?? null })
          ingested++
          recordFileProcessed(stats, ext, fileTimeMs, true)
        } else if (result.status === 'skipped_type') {
          skippedType++
          recordFileProcessed(stats, 'skipped', 0, false)
        } else if (result.status === 'skipped_dupe') {
          skippedDupe++
          recordFileProcessed(stats, 'skipped', 0, false)
        } else if (result.status === 'skipped_size') {
          skippedSize++
          recordFileProcessed(stats, 'skipped', 0, false)
          console.log(pc.yellow(`Skipped (too large): ${result.name}`))
        }
      }
    }

    writeManifest(entries)

    // Update stats with final counts
    stats.ingested = ingested
    stats.skippedType = skippedType
    stats.skippedDupe = skippedDupe
    stats.skippedSize = skippedSize
    finalizeStats(stats)

    // Display stats unless suppressed
    if (options.stats !== false) {
      console.log(displayIngestStats(stats, VALID_EXTS))
    }

    if (options.compile) {
      console.log()
      const compileStats = createCompileStats()
      const spinner = ora('Compiling wiki...').start()
      try {
        await runCompile(root, {}, (msg) => {
          spinner.text = msg
        }, compileStats)
        spinner.succeed('Compilation complete')
        // Add newline before stats for better separation
        if (options.stats !== false) {
          const statsOutput = displayCompileStats(compileStats)
          if (statsOutput.trim()) {
            console.log(statsOutput)
          }
        }
        console.log(`Run ${pc.cyan('theora ask <question>')} to query the wiki`)
      } catch (err) {
        spinner.fail(`Compilation failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    } else {
      console.log(`Next: ${pc.cyan('theora compile')} to build the wiki`)
    }
  })