import { Command } from 'commander'
import { existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot, safeJoin } from '../lib/paths.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { VALID_EXTS, ingestLocalFile, ingestUrlSource, isUrl, isValidFile } from '../lib/ingest.js'
import { normalizeYouTubeInput } from '../lib/youtube.js'
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
  .argument('<sources...>', 'files, directories, or URLs to ingest')
  .option('--tag <tag>', 'tag to categorize the source')
  .action(async (sources: string[], options: { tag?: string }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    if (options.tag && !/^[a-z0-9][a-z0-9-]*$/.test(options.tag)) {
      console.error(pc.red(`Invalid tag "${options.tag}" — use lowercase letters, numbers, and hyphens only`))
      process.exit(1)
    }

    const destDir = options.tag ? safeJoin(paths.raw, options.tag) : paths.raw
    mkdirSync(destDir, { recursive: true })

    const entries = readManifest()
    const existingNames = new Set(entries.map(e => e.name))

    let ingested = 0, skippedType = 0, skippedDupe = 0, skippedSize = 0

    for (const source of sources) {
      const normalizedYouTubeSource = normalizeYouTubeInput(source)
      const remoteSource = normalizedYouTubeSource ?? (isUrl(source) ? source : null)

      if (remoteSource) {
        const spinner = ora(`Fetching: ${source}`).start()
        const result = await ingestUrlSource(remoteSource, destDir, existingNames)
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

      for (const file of filesToIngest) {
        const result = ingestLocalFile(file, destDir, existingNames)
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

    console.log(`Next: ${pc.cyan('theora compile')} to build the wiki`)
  })
