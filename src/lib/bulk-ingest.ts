import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { stdin } from 'node:process'
import { join, dirname, basename, extname } from 'node:path'
import AdmZip from 'adm-zip'
import ora from 'ora'
import pc from 'picocolors'
import { ingestUrlSource, type IngestResult } from './ingest.js'
import { safeJoin } from './paths.js'
import {
  validateKnowledgeBase,
  safeValidateKnowledgeBase,
  extractUrls,
  type KnowledgeBase,
} from './kb-schema.js'

export interface BulkIngestOptions {
  filePath: string // '-' for stdin
  destDir: string
  existingNames: Set<string>
  existingUrls: Set<string>
  tag?: string
}

export interface BulkIngestResult {
  kb?: KnowledgeBase
  urls: string[]
  results: IngestResult[]
  stats: {
    total: number
    ingested: number
    skippedDupe: number
    errors: number
  }
}

async function readInput(filePath: string): Promise<string> {
  if (filePath === '-') {
    const chunks: Buffer[] = []
    for await (const chunk of stdin) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks).toString('utf-8')
  }
  return readFile(filePath, 'utf-8')
}

function parseUrlsFromText(content: string): string[] {
  return content
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

function parseUrls(content: string): { urls: string[]; kb?: KnowledgeBase } {
  const trimmed = content.trim()

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)

      // Handle { items: [...] } format (KB JSON)
      if (parsed.items && Array.isArray(parsed.items)) {
        const validation = safeValidateKnowledgeBase(parsed)
        if (validation.success) {
          return { urls: extractUrls(validation.data), kb: validation.data }
        }
        // If validation fails, fall through to extract URLs anyway
        return {
          urls: parsed.items
            .map((item: { url?: string }) => item.url)
            .filter((url: string | undefined): url is string => typeof url === 'string' && url.length > 0),
        }
      }

      // Handle ["url1", "url2"] format
      if (Array.isArray(parsed)) {
        return {
          urls: parsed.filter((item): item is string => typeof item === 'string' && item.length > 0),
        }
      }
    } catch {
      // Not valid JSON, fall through to text parsing
    }
  }

  // Text format: one URL per line
  return { urls: parseUrlsFromText(content) }
}

/**
 * Extract and import files from a zip archive
 */
export async function importFromZip(
  zipPath: string,
  destDir: string,
  existingNames: Set<string>,
  existingUrls: Set<string>,
  tag?: string,
): Promise<BulkIngestResult> {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  // Find manifest.json
  const manifestEntry = entries.find(e => e.entryName === 'manifest.json')
  if (!manifestEntry) {
    throw new Error('Invalid export: manifest.json not found in zip')
  }

  // Parse manifest
  const manifestContent = manifestEntry.getData().toString('utf-8')
  const kb = validateKnowledgeBase(JSON.parse(manifestContent))

  const results: IngestResult[] = []
  let ingested = 0, skippedDupe = 0, errors = 0

  console.error(pc.cyan(`\nKnowledge Base: ${kb.name}`))
  if (kb.description) console.error(pc.gray(kb.description))
  console.error()

  // Extract and import files
  for (const item of kb.items) {
    if (!item.localPath) {
      // Try to ingest from URL if no local path
      if (item.url) {
        const spinner = ora(`Fetching: ${item.url}`).start()
        try {
          const result = await ingestUrlSource(item.url, destDir, existingNames, existingUrls)
          results.push(result)
          if (result.status === 'ingested') {
            ingested++
            spinner.succeed(`Fetched: ${result.name}`)
          } else if (result.status === 'skipped_dupe') {
            skippedDupe++
            spinner.warn(`Already ingested: ${result.name}`)
          } else {
            errors++
            spinner.fail(`Failed: ${result.error ?? 'Unknown error'}`)
          }
        } catch (err) {
          errors++
          const msg = err instanceof Error ? err.message : String(err)
          spinner.fail(`Failed: ${msg}`)
        }
      }
      continue
    }

    // Find file in zip
    const fileEntry = entries.find(e => e.entryName === item.localPath)
    if (!fileEntry) {
      console.warn(pc.yellow(`Warning: File not found in archive: ${item.localPath}`))
      errors++
      continue
    }

    // Check for duplicates
    if (existingNames.has(item.title)) {
      results.push({ name: item.title, status: 'skipped_dupe' })
      skippedDupe++
      continue
    }

    // Extract file to destination
    const destSubdir = tag ? join(destDir, tag) : destDir
    mkdirSync(destSubdir, { recursive: true })
    const destPath = safeJoin(destSubdir, item.title)

    const content = fileEntry.getData()
    writeFileSync(destPath, content)

    existingNames.add(item.title)
    results.push({ name: item.title, status: 'ingested' })
    ingested++
  }

  return {
    kb,
    urls: [],
    results,
    stats: {
      total: kb.items.length,
      ingested,
      skippedDupe,
      errors,
    },
  }
}

/**
 * Check if a file is a zip archive
 */
export function isZipFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.zip'
}

export async function bulkIngest(options: BulkIngestOptions): Promise<BulkIngestResult> {
  // Check if input is a zip file
  if (isZipFile(options.filePath)) {
    return importFromZip(
      options.filePath,
      options.destDir,
      options.existingNames,
      options.existingUrls,
      options.tag,
    )
  }

  const content = await readInput(options.filePath)
  const { urls, kb } = parseUrls(content)

  if (urls.length === 0) {
    console.error(pc.yellow('No URLs found to ingest'))
    return {
      kb,
      urls: [],
      results: [],
      stats: { total: 0, ingested: 0, skippedDupe: 0, errors: 0 },
    }
  }

  const results: IngestResult[] = []
  let ingested = 0,
    skippedDupe = 0,
    errors = 0

  // Show KB info if available
  if (kb) {
    console.error(pc.cyan(`\nKnowledge Base: ${kb.name}`))
    if (kb.description) console.error(pc.gray(kb.description))
    if (kb.subject && kb.subject.length > 0) {
      console.error(pc.gray(`Topics: ${kb.subject.join(', ')}`))
    }
    console.error()
  }

  console.error(pc.cyan(`Ingesting ${urls.length} URL${urls.length !== 1 ? 's' : ''} from ${options.filePath === '-' ? 'stdin' : options.filePath}\n`))

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!
    const progress = `[${i + 1}/${urls.length}]`
    const spinner = ora(`${progress} Fetching: ${url}`).start()

    try {
      const result = await ingestUrlSource(url, options.destDir, options.existingNames, options.existingUrls)

      results.push(result)

      switch (result.status) {
        case 'ingested':
          ingested++
          spinner.succeed(`${progress} Fetched: ${result.name}`)
          break
        case 'skipped_dupe':
          skippedDupe++
          spinner.warn(`${progress} Already ingested: ${result.name}`)
          break
        case 'error':
          errors++
          spinner.fail(`${progress} Failed: ${result.error ?? 'Unknown error'}`)
          break
        default:
          spinner.stop()
      }
    } catch (err) {
      errors++
      const errorMsg = err instanceof Error ? err.message : String(err)
      spinner.fail(`${progress} Failed: ${errorMsg}`)
    }
  }

  return {
    kb,
    urls,
    results,
    stats: {
      total: urls.length,
      ingested,
      skippedDupe,
      errors,
    },
  }
}

/**
 * Validate a knowledge base JSON string
 */
export function validateKbJson(content: string): KnowledgeBase {
  const parsed = JSON.parse(content)
  return validateKnowledgeBase(parsed)
}

// Re-export types for convenience
export { validateKnowledgeBase, safeValidateKnowledgeBase, extractUrls, type KnowledgeBase }