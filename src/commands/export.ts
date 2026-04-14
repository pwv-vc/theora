import { Command } from 'commander'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename, dirname } from 'node:path'
import pc from 'picocolors'
import AdmZip from 'adm-zip'
import { kbPaths, requireKbRoot, safeJoin } from '../lib/paths.js'
import { readManifest } from '../lib/manifest.js'
import { readConfig } from '../lib/config.js'
import { slugify } from '../lib/utils.js'
import type { KnowledgeBase, ResourceItem } from '../lib/kb-schema.js'

export interface ExportOptions {
  output?: string
  format?: string
  metadataOnly?: boolean
}

/**
 * Recursively collect all files in a directory
 */
function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}

/**
 * Build the Dublin Core-aligned KB structure from manifest
 */
function buildKnowledgeBase(root: string, paths: ReturnType<typeof kbPaths>): KnowledgeBase {
  const manifest = readManifest()
  const config = readConfig()

  if (manifest.length === 0) {
    throw new Error('No sources in knowledge base to export')
  }

  return {
    name: config.name,
    description: `Knowledge base exported from ${config.name}`,
    creator: 'theora',
    date: new Date().toISOString().split('T')[0],
    language: 'en',
    publisher: 'theora',
    rights: 'See individual item rights',
    source: paths.root,
    items: manifest.map((entry) => {
      const item: ResourceItem = {
        url: entry.url || '',
        title: entry.name,
      }

      if (entry.tag) {
        item.subject = [entry.tag]
      }

      item.date = entry.ingested.split('T')[0]
      item.language = 'en'
      item.type = 'document'
      item.format = 'text/html'

      // Store relative path for portable exports
      const relativePath = entry.tag
        ? join('raw', entry.tag, entry.name)
        : join('raw', entry.name)
      ;(item as ResourceItem & { localPath?: string }).localPath = relativePath

      return item
    }),
  }
}

/**
 * Export knowledge base as a zip archive with full content
 */
function exportAsZip(root: string, outputPath: string, kb: KnowledgeBase, paths: ReturnType<typeof kbPaths>): void {
  const zip = new AdmZip()

  // Add manifest.json
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(kb, null, 2), 'utf-8'))

  // Collect all files from raw/ directory
  const rawFiles = collectFiles(paths.raw)

  for (const filePath of rawFiles) {
    // Skip manifest
    if (basename(filePath) === '.manifest.json') continue

    // Calculate relative path from KB root
    const relPath = relative(root, filePath)

    try {
      const content = readFileSync(filePath)
      zip.addFile(relPath, content)
    } catch (err) {
      console.warn(pc.yellow(`Warning: Could not read file: ${relPath}`))
    }
  }

  // Write zip file
  zip.writeZip(outputPath)
}

/**
 * Export command - Export knowledge base to portable format
 *
 * Default: Creates a zip archive with manifest + raw files for full portability.
 * The zip contains:
 *   - manifest.json: Dublin Core metadata with file references
 *   - raw/ directory: All ingested files organized by tag
 *
 * Use --metadata-only for JSON-only export (legacy behavior, not portable).
 *
 * Import with: theora ingest --from <export.zip>
 */
export const exportCommand = new Command('export')
  .description('Export knowledge base to portable zip archive (default) or JSON metadata')
  .option('-o, --output <file>', 'output file (default: <kb-name>-<YYYYMMDD>.zip)')
  .option('--metadata-only', 'export only metadata as JSON (no file content, not portable)')
  .option('-f, --format <format>', 'output format: zip or json', 'zip')
  .action(async (options: ExportOptions) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const config = readConfig()

    // Build KB structure
    let kb: KnowledgeBase
    try {
      kb = buildKnowledgeBase(root, paths)
    } catch (error) {
      console.error(pc.yellow(error instanceof Error ? error.message : String(error)))
      process.exit(0)
    }

    // Determine output format and path
    const metadataOnly = options.metadataOnly ?? false
    const format = metadataOnly ? 'json' : (options.format ?? 'zip')

    // Determine output filename
    let outputPath: string | undefined
    if (options.output) {
      outputPath = options.output
    } else if (!metadataOnly && format === 'zip') {
      // Default zip filename: <slugified-kb-name>-<timestamp>.zip
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const safeName = slugify(config.name)
      outputPath = `${safeName}-${timestamp}.zip`
    }

    // Export based on format
    if (format === 'zip' && !metadataOnly) {
      // Create zip archive with full content
      exportAsZip(root, outputPath!, kb, paths)
      console.log(pc.green('✓') + ` Exported ${kb.items.length} sources to ${outputPath}`)
      console.log(pc.gray('Archive includes: manifest.json + raw/ files'))
    } else {
      // Metadata-only JSON export
      const output = JSON.stringify(kb, null, 2)

      if (outputPath) {
        writeFileSync(outputPath, output)
        console.log(pc.green('✓') + ` Exported ${kb.items.length} sources to ${outputPath}`)
        console.log(pc.yellow('Warning: Metadata-only export does not include file content'))
      } else {
        console.log(output)
      }
    }
  })