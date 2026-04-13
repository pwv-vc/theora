import { readFile } from 'node:fs/promises'
import { stdin } from 'node:process'
import ora from 'ora'
import pc from 'picocolors'
import { ingestUrlSource, type IngestResult } from './ingest.js'
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

export async function bulkIngest(options: BulkIngestOptions): Promise<BulkIngestResult> {
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
