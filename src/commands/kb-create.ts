import { Command } from 'commander'
import { writeFileSync } from 'node:fs'
import pc from 'picocolors'
import ora from 'ora'
import { llmWithWebSearch, llmWithStats, type LlmWithWebSearchResult, type LlmResult } from '../lib/llm.js'
import { validateKnowledgeBase, type KnowledgeBase } from '../lib/kb-schema.js'
import { buildKbCreateSystemPrompt, buildKbCreateUserPrompt } from '../lib/prompts/kb-create.js'
import { formatDuration } from '../lib/utils.js'

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

export const kbCreateCommand = new Command('create')
  .description('Create a knowledge base definition by discovering content on a topic')
  .requiredOption('--topic <topic>', 'Topic to search for')
  .option('--source-types <types>', 'Comma-separated whitelist of content types', 'web_page,pdf,image,video_file,youtube_video')
  .option('--distribution <desc>', 'Natural language distribution guidance (e.g., "mostly web pages, some PDFs, at least one image")', 'balanced mix of all types')
  .option('--min-items <n>', 'Minimum items to find', '10')
  .option('--max-items <n>', 'Maximum items to find', '10')
  .option('--output <file>', 'Output file (default: stdout)')
  .option('--verify-urls', 'Verify URLs are accessible before including', true)
  .option('--no-verify-urls', 'Skip URL verification (faster but may include broken links)')
  .action(async (options) => {
    // Show options before starting
    console.log(pc.cyan(`\nCreating knowledge base for topic: ${pc.white(options.topic)}`))
    console.log(pc.gray(`  Source types: ${options.sourceTypes}`))
    console.log(pc.gray(`  Distribution: ${options.distribution}`))
    console.log(pc.gray(`  Items: ${options.minItems}-${options.maxItems}`))
    console.log(pc.gray(`  Verify URLs: ${options.verifyUrls ? 'enabled' : 'disabled'}`))
    if (options.output) console.log(pc.gray(`  Output: ${options.output}`))
    console.log()

    const spinner = ora('Discovering content...').start()

    try {
      // Parse options
      const sourceTypes = options.sourceTypes.split(',').map((t: string) => t.trim())
      const minItems = parseInt(options.minItems, 10)
      const maxItems = parseInt(options.maxItems, 10)

      // Generate slug from topic for IDs
      const topicSlug = options.topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30)

      // Build prompts
      const systemPrompt = buildKbCreateSystemPrompt()
      const userPrompt = buildKbCreateUserPrompt({
        topic: options.topic,
        sourceTypes,
        distribution: options.distribution,
        minItems,
        maxItems,
        topicSlug,
      })

      // First, search for real URLs using web search
      spinner.text = 'Searching for real URLs...'
      const searchResult: LlmWithWebSearchResult = await llmWithWebSearch(
        `Find ${maxItems} real, accessible URLs about "${options.topic}". Include diverse sources like Wikipedia, news articles, academic sources, and official sites. Return a list of URLs with brief descriptions.`,
        {
          system: 'You are a web search assistant. Use web search to find real, working URLs. Only return URLs that actually exist.',
          maxTokens: 4096,
          action: 'kb-create-search',
          meta: options.topic,
        }
      )

      // Now create the KB using the search results
      spinner.text = 'Curating content with LLM...'
      const searchResultsText = searchResult.searchResults
        ?.map((r, i) => `${i + 1}. ${r.title}: ${r.url}`)
        .join('\n') || ''

      const userPromptWithSearch = `${userPrompt}\n\nUse these real URLs found via web search:\n${searchResultsText}`

      const llmResult: LlmResult = await llmWithStats(userPromptWithSearch, {
        system: systemPrompt,
        maxTokens: 8192,
        action: 'kb-create',
        meta: options.topic,
      })

      // Parse and validate response
      spinner.text = 'Validating KB structure...'
      let kb: KnowledgeBase
      try {
        // Extract JSON from response (in case LLM adds markdown fences)
        const jsonMatch = llmResult.text.match(/```json\n?([\s\S]*?)```/) ||
          llmResult.text.match(/```\n?([\s\S]*?)```/) ||
          [null, llmResult.text]
        const jsonStr = jsonMatch[1]?.trim() || llmResult.text.trim()
        kb = validateKnowledgeBase(JSON.parse(jsonStr))
      } catch (err) {
        throw new Error(`LLM returned invalid KB JSON: ${err instanceof Error ? err.message : String(err)}`)
      }

      // Optional URL verification
      if (options.verifyUrls) {
        spinner.text = 'Verifying URLs...'
        const verifiedItems = []

        for (const item of kb.items) {
          const isValid = await verifyUrl(item.url)
          if (isValid) {
            verifiedItems.push(item)
          } else {
            spinner.warn(`Skipping unreachable URL: ${item.url}`)
          }
        }

        kb.items = verifiedItems
        spinner.text = `Verified ${verifiedItems.length} URLs`
      }

      // Validate min/max constraints
      if (kb.items.length < minItems) {
        spinner.warn(`LLM returned only ${kb.items.length} items, but minimum requested was ${minItems}`)
      }
      if (kb.items.length > maxItems) {
        spinner.warn(`LLM returned ${kb.items.length} items, but maximum requested was ${maxItems}. Trimming to ${maxItems}.`)
        kb.items = kb.items.slice(0, maxItems)
      }

      // Output
      const output = JSON.stringify(kb, null, 2)

      // Count items by type
      const typeCounts = new Map<string, number>()
      for (const item of kb.items) {
        const type = item.type ?? 'unknown'
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
      }
      const typeSummary = [...typeCounts.entries()]
        .map(([type, count]) => `${type} (${count})`)
        .join(', ')

      // Format LLM stats (include both web search and curation costs)
      const totalCostUsd = searchResult.estimatedCostUsd + llmResult.estimatedCostUsd
      const costFormatted = totalCostUsd < 0.01
        ? '<$0.01'
        : `$${totalCostUsd.toFixed(2)}`

      if (options.output) {
        writeFileSync(options.output, output + '\n')
        spinner.succeed(`Knowledge base saved to ${pc.cyan(options.output)}`)
        console.log(`  ${pc.gray('Items:')} ${kb.items.length}`)
        console.log(`  ${pc.gray('Types:')} ${typeSummary}`)
        console.log(`  ${pc.gray('LLM:')} ${llmResult.model} · ${formatDuration(llmResult.durationMs)} · ${pc.gray(costFormatted)}`)
      } else {
        spinner.succeed(`Knowledge base created with ${kb.items.length} items`)
        console.log(`  ${pc.gray('Types:')} ${typeSummary}`)
        console.log(`  ${pc.gray('LLM:')} ${llmResult.model} · ${formatDuration(llmResult.durationMs)} · ${pc.gray(costFormatted)}`)
        console.log()
        console.log(output)
      }

    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })
