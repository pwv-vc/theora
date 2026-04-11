import { Command } from 'commander'
import { copyFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot, safeJoin } from '../lib/paths.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { VALID_EXTS, isUrl, isValidFile, fetchUrl, maxIngestBytesForFilename } from '../lib/ingest.js'
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
      if (isUrl(source)) {
        const spinner = ora(`Fetching: ${source}`).start()
        try {
          const { name } = await fetchUrl(source, destDir)

          if (existingNames.has(name)) {
            spinner.warn(`Already ingested: ${name}`)
            skippedDupe++
            continue
          }

          existingNames.add(name)
          entries.push({ name, ingested: new Date().toISOString(), tag: options.tag ?? null, url: source })
          ingested++
          spinner.succeed(`Fetched: ${name}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          spinner.fail(`Failed to fetch ${source}: ${msg}`)
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
        if (!isValidFile(file)) { skippedType++; continue }

        const name = basename(file)
        if (existingNames.has(name)) { skippedDupe++; continue }

        const maxBytes = maxIngestBytesForFilename(name)
        if (statSync(file).size > maxBytes) {
          skippedSize++
          console.log(pc.yellow(`Skipped (too large): ${name}`))
          continue
        }

        copyFileSync(file, join(destDir, name))
        existingNames.add(name)
        entries.push({ name, ingested: new Date().toISOString(), tag: options.tag ?? null })
        ingested++
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
