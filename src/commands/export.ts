import { Command } from 'commander'
import { writeFileSync } from 'node:fs'
import pc from 'picocolors'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { readManifest } from '../lib/manifest.js'
import { readConfig } from '../lib/config.js'
import type { KnowledgeBase, ResourceItem } from '../lib/kb-schema.js'

/**
 * Export command - Export knowledge base to Dublin Core-aligned JSON
 *
 * Exports the current knowledge base manifest to a structured JSON file
 * using Dublin Core metadata standards for interoperability.
 */
export const exportCommand = new Command('export')
  .description('Export knowledge base to Dublin Core-aligned JSON')
  .option('-o, --output <file>', 'output file (default: stdout)')
  .option('-f, --format <format>', 'output format: json or yaml', 'json')
  .action(async (options: { output?: string; format?: string }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    // Read manifest and config
    const manifest = readManifest()
    const config = readConfig()

    if (manifest.length === 0) {
      console.error(pc.yellow('No sources in knowledge base to export'))
      process.exit(0)
    }

    // Build Dublin Core-aligned KB structure
    const kb: KnowledgeBase = {
      // Core identification
      name: config.name,
      description: `Knowledge base exported from ${config.name}`,

      // Dublin Core metadata
      creator: 'theora',
      date: new Date().toISOString().split('T')[0],
      language: 'en',
      publisher: 'theora',
      rights: 'See individual item rights',
      source: paths.root,

      // Items from manifest
      items: manifest.map((entry) => {
        const item: ResourceItem = {
          url: entry.url || '',
          title: entry.name,
        }

        // Add metadata if available
        if (entry.tag) {
          item.subject = [entry.tag]
        }

        item.date = entry.ingested.split('T')[0]
        item.language = 'en'
        item.type = 'document'
        item.format = 'text/html'

        return item
      }),
    }

    // Generate output
    const format = options.format || 'json'
    let output: string

    if (format === 'json') {
      output = JSON.stringify(kb, null, 2)
    } else {
      console.error(pc.red(`Unsupported format: ${format}. Use: json`))
      process.exit(1)
    }

    // Write output
    if (options.output) {
      writeFileSync(options.output, output)
      console.log(pc.green('✓') + ` Exported ${manifest.length} sources to ${options.output}`)
    } else {
      console.log(output)
    }
  })
