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
  .action(async (sources: string[], options: { tag?: string; from?: string; compile?: boolean }) => {
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
            }
          }

          writeManifest(entries)
          spinner.succeed(`Imported from zip archive`)

          // Display stats
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
          }
        }

        writeManifest(entries)

        // Display stats
        const parts = [`Ingested ${result.stats.ingested} file${result.stats.ingested !== 1 ? 's' : ''}`]
        if (result.stats.skippedDupe > 0) parts.push(`${result.stats.skippedDupe} skipped (already ingested)`)
        if (result.stats.errors > 0) parts.push(`${result.stats.errors} failed`)
        console.log(pc.green('✓') + ' ' + parts.join(', '))
      }

      // Handle --compile flag after bulk ingest operations
      if (options.compile) {
        console.log()
        const spinner = ora('Compiling wiki...').start()
        try {
          await runCompile(root, {})
          spinner.succeed('Compilation complete')
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
        const result = await ingestUrlSource(remoteSource, destDir, existingNames, existingUrls)
        if (result.status === 'ingested') {
          entries.push({
            name: result.name,
            ingested: new Date().toISOString(),
            tag: options.tag ?? null,
            url: result.url ?? remoteSource,
          })
          ingested++
          spinner.succeed(`Fetched: ${result.name}`)
        } else if (result.status === 'skipped_dupe') {
          skippedDupe++
          spinner.warn(`Already ingested: ${result.name}`)
        } else {
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
        const result = ingestLocalFile(file, destDir, existingNames, sourceRoot)
        if (result.status === 'ingested') {
          entries.push({ name: result.name, ingested: new Date().toISOString(), tag: options.tag ?? null })
          ingested++
        } else if (result.status === 'skipped_type') {
          skippedType++
        } else if (result.status === 'skipped_dupe') {
          skippedDupe++
        } else if (result.status === 'skipped_size') {
          skippedSize++
          console.log(pc.yellow(`Skipped (too large): ${result.name}`))
        }
      }
    }

    writeManifest(entries)

    const parts = [`Ingested ${ingested} file${ingested !== 1 ? 's' : ''}`]
    if (skippedType > 0) parts.push(`${skippedType} skipped (unsupported type)`)
    if (skippedDupe > 0) parts.push(`${skippedDupe} skipped (already ingested)`)
    if (skippedSize > 0) parts.push(`${skippedSize} skipped (exceeds size limit for file type)`)
    console.log(pc.green('✓') + ' ' + parts.join(', '))

    if (skippedType > 0) {
      console.log(pc.gray(`Supported: ${[...VALID_EXTS].join(', ')}`))
    }

    if (options.compile) {
      console.log()
      const spinner = ora('Compiling wiki...').start()
      try {
        await runCompile(root, {})
        spinner.succeed('Compilation complete')
        console.log(`Run ${pc.cyan('theora ask <question>')} to query the wiki`)
      } catch (err) {
        spinner.fail(`Compilation failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    } else {
      console.log(`Next: ${pc.cyan('theora compile')} to build the wiki`)
    }
  })
