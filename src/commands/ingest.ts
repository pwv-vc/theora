import { Command } from 'commander'
import { copyFileSync, existsSync, mkdirSync, statSync, readdirSync, writeFileSync } from 'node:fs'
import { join, basename, resolve, extname } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { slugify } from '../lib/utils.js'

const VALID_EXTS = new Set([
  '.md', '.mdx', '.txt', '.html', '.json', '.csv', '.xml', '.yaml', '.yml',
  '.pdf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
])

const CONTENT_TYPE_EXT: Record<string, string> = {
  'text/html': '.html',
  'text/plain': '.txt',
  'application/json': '.json',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://')
}

function isValidFile(path: string): boolean {
  return VALID_EXTS.has(extname(path).toLowerCase())
}

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

function filenameFromUrl(url: string, contentType: string): string {
  const parsed = new URL(url)
  const pathPart = parsed.pathname.replace(/\/$/, '')
  const urlBasename = pathPart.split('/').pop() ?? ''
  const urlExt = extname(urlBasename).toLowerCase()

  // Use URL's own extension if it's valid
  if (urlExt && VALID_EXTS.has(urlExt)) {
    const stem = urlBasename.slice(0, -urlExt.length)
    return `${slugify(stem || parsed.hostname)}${urlExt}`
  }

  // Derive extension from Content-Type
  const mimeBase = contentType.split(';')[0].trim()
  const ext = CONTENT_TYPE_EXT[mimeBase] ?? '.html'
  const stem = urlBasename ? slugify(urlBasename) : slugify(parsed.hostname + parsed.pathname)
  return `${stem}${ext}`
}

async function fetchUrl(url: string, destDir: string): Promise<{ name: string; skipped: boolean }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? 'text/html'
  const name = filenameFromUrl(url, contentType)
  const destPath = join(destDir, name)

  const mimeBase = contentType.split(';')[0].trim()
  const isImage = mimeBase.startsWith('image/')

  if (isImage) {
    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(destPath, buffer)
  } else {
    const text = await response.text()
    writeFileSync(destPath, text)
  }

  return { name, skipped: false }
}

export const ingestCommand = new Command('ingest')
  .description('Add source documents to the knowledge base')
  .argument('<sources...>', 'files, directories, or URLs to ingest')
  .option('--tag <tag>', 'tag to categorize the source')
  .action(async (sources: string[], options: { tag?: string }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    const destDir = options.tag ? join(paths.raw, options.tag) : paths.raw
    mkdirSync(destDir, { recursive: true })

    const entries = readManifest()
    const existingNames = new Set(entries.map(e => e.name))

    let ingested = 0, skippedType = 0, skippedDupe = 0

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
    console.log(pc.green('✓') + ' ' + parts.join(', '))

    if (skippedType > 0) {
      console.log(pc.gray(`Supported: ${[...VALID_EXTS].join(', ')}`))
    }

    console.log(`Next: ${pc.cyan('theora compile')} to build the wiki`)
  })
