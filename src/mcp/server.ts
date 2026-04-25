import { relative } from 'node:path'
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server'
import type { CallToolResult } from '@modelcontextprotocol/server'
import { searchArticles } from '../lib/search.js'
import { streamAsk } from '../lib/ask.js'
import {
  listWikiArticles,
  readWikiIndex,
  getAllTagsWithCounts,
  getAllEntitiesWithCounts,
  getWikiStats,
} from '../lib/wiki.js'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { readConfig, getKbName } from '../lib/config.js'

interface McpToolContext {
  signal?: AbortSignal
  _meta?: { progressToken?: string | number }
  log?: (level: string, data: unknown, logger?: string) => void
  notify?: (notification: { method: string; params: Record<string, unknown> }) => Promise<void>
}

const VERSION = '0.0.1'
const DEFAULT_MCP_ASK_MAX_CONTEXT = 8
const DEFAULT_MCP_ASK_TIMEOUT_MS = 45_000

function isMcpDebugEnabled(): boolean {
  const raw = process.env.THEORA_MCP_DEBUG?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function getMcpAskTimeoutMs(): number {
  const raw = process.env.THEORA_MCP_ASK_TIMEOUT_MS
  if (!raw) return DEFAULT_MCP_ASK_TIMEOUT_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MCP_ASK_TIMEOUT_MS
  return parsed
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function mcpDebugLog(enabled: boolean, message: string): void {
  if (!enabled) return
  const timestamp = new Date().toISOString()
  console.error(`[theora:mcp][${timestamp}] ${message}`)
}

function createMcpRequestScope(kind: 'tool' | 'resource', name: string, enabled: boolean) {
  const requestId = Math.random().toString(36).slice(2, 10)
  const startedAt = Date.now()
  mcpDebugLog(enabled, `${kind} ${name} request ${requestId} started`)
  return {
    requestId,
    startedAt,
    done(extra?: string) {
      mcpDebugLog(
        enabled,
        `${kind} ${name} request ${requestId} completed in ${Date.now() - startedAt}ms${extra ? `; ${extra}` : ''}`,
      )
    },
    fail(err: unknown) {
      mcpDebugLog(
        enabled,
        `${kind} ${name} request ${requestId} failed after ${Date.now() - startedAt}ms: ${err instanceof Error ? err.message : String(err)}`,
      )
    },
  }
}

export function createTheoraMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'theora', version: VERSION },
    {
      instructions: [
        'Theora is an LLM-powered knowledge base that turns raw research into a living wiki.',
        'Use `search` to find articles by keyword (BM25 full-text search).',
        'Use `read-article` with a path from search results to fetch full article content.',
        'Use `ask` to get an AI-synthesized answer grounded in the wiki.',
        'Use `list-tags` and `list-entities` to discover what the KB covers before querying.',
        'Prefer searching before asking — search is instant, ask invokes an LLM.',
      ].join(' '),
      capabilities: {
        logging: {},
      },
    },
  )

  registerTools(server)
  registerResources(server)

  // No-op subscribe/unsubscribe — the SDK doesn't implement these and
  // Cursor will retry method-not-found errors in a loop.
  server.server.setRequestHandler('resources/subscribe', async () => ({}))
  server.server.setRequestHandler('resources/unsubscribe', async () => ({}))

  return server
}

// ── Tools ────────────────────────────────────────────────────────────────────

function registerTools(server: McpServer): void {
  server.registerTool(
    'search',
    {
      title: 'Search Wiki',
      description:
        'BM25 full-text search across the knowledge base. Returns ranked results with titles, paths, scores, snippets, and tags.',
      inputSchema: fromJsonSchema({
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search terms' },
          tag: { type: 'string', description: 'Filter results by tag' },
          entity: { type: 'string', description: 'Filter by entity (format: type/name, e.g. person/john-doe)' },
          limit: { type: 'number', description: 'Max results to return', default: 10 },
        },
        required: ['query'],
      }),
      annotations: { readOnlyHint: true },
    },
    async (args): Promise<CallToolResult> => {
      const { query, tag, entity, limit } = args as { query: string; tag?: string; entity?: string; limit?: number };
      const debugEnabled = isMcpDebugEnabled()
      const scope = createMcpRequestScope('tool', 'search', debugEnabled)
      try {
        const maxResults = Math.min(limit ?? 10, 100)
        const { results, suggestedQuery } = searchArticles(query, tag, entity)
        const limited = results.slice(0, maxResults)

        if (limited.length === 0) {
          const hint = suggestedQuery ? `\nDid you mean: "${suggestedQuery}"` : ''
          scope.done(`query="${query}", results=0`)
          return { content: [{ type: 'text', text: `No results for "${query}".${hint}` }] }
        }

        const lines = limited.map((r, i) => {
          const score = Number.isFinite(r.score) ? r.score.toFixed(3) : '—'
          const tags = r.tags.length ? ` [${r.tags.join(', ')}]` : ''
          return `${i + 1}. **${r.title}** (${r.relativePath})${tags}\n   Score: ${score}\n   ${r.snippet}`
        })

        const header = `${limited.length} result(s) for "${query}"` +
          (suggestedQuery ? `\nDid you mean: "${suggestedQuery}"` : '')

        scope.done(`query="${query}", results=${limited.length}`)
        return { content: [{ type: 'text', text: `${header}\n\n${lines.join('\n\n')}` }] }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `Search failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'ask',
    {
      title: 'Ask the Wiki',
      description:
        'Ask a question and get an AI-synthesized answer grounded in the knowledge base wiki. ' +
        'Like the CLI `theora ask` command, the Q&A is filed under `output/` when the run completes. ' +
        'This invokes an LLM call (slower than search) and uses a low-latency MCP profile by default — prefer `search` for simple lookups.',
      inputSchema: fromJsonSchema({
        type: 'object' as const,
        properties: {
          question: { type: 'string', description: 'The question to ask' },
          tag: { type: 'string', description: 'Filter wiki articles by tag' },
          entity: { type: 'string', description: 'Filter by entity (format: type/name)' },
          maxContext: { type: 'number', description: 'Max wiki articles to include in context' },
          debug: { type: 'boolean', description: 'Enable verbose MCP server logs for ask progress' },
        },
        required: ['question'],
      }),
    },
    async (args, ctx): Promise<CallToolResult> => {
      const { question, tag, entity, maxContext, debug } = args as {
        question: string
        tag?: string
        entity?: string
        maxContext?: number
        debug?: boolean
      };
      const debugEnabled = Boolean(debug) || isMcpDebugEnabled()
      const scope = createMcpRequestScope('tool', 'ask', debugEnabled)

      // Extract MCP context for progress reporting and abort detection
      const mcpReq = (ctx as { mcpReq?: McpToolContext })?.mcpReq
      const signal = mcpReq?.signal
      const progressToken = mcpReq?._meta?.progressToken

      function sendMcpProgress(progress: number, total: number, message?: string): void {
        if (!progressToken || !mcpReq?.notify) return
        mcpReq.notify({
          method: 'notifications/progress',
          params: { progressToken, progress, total, ...(message ? { message } : {}) },
        }).catch(() => {})
      }

      function sendMcpLog(message: string): void {
        mcpReq?.log?.('info', message, 'theora')
      }

      try {
        let answer = ''
        let chunkCount = 0
        let charCount = 0
        const effectiveMaxContext = maxContext ?? DEFAULT_MCP_ASK_MAX_CONTEXT
        const timeoutMs = getMcpAskTimeoutMs()
        mcpDebugLog(
          debugEnabled,
          `tool ask request ${scope.requestId} params: question="${question.slice(0, 120)}${question.length > 120 ? '…' : ''}", tag=${tag ?? 'none'}, entity=${entity ?? 'none'}, maxContext=${effectiveMaxContext}, timeoutMs=${timeoutMs}`,
        )

        sendMcpLog(`Searching wiki for relevant context…`)
        sendMcpProgress(10, 100, 'Building context')

        const result = await withTimeout(
          streamAsk(question, {
            tag,
            entity,
            maxContext: effectiveMaxContext,
            onContextBuilt: () => {
              sendMcpProgress(30, 100, 'Context ready, generating answer')
              sendMcpLog('Context ready — streaming answer…')
              mcpDebugLog(
                debugEnabled,
                `tool ask request ${scope.requestId} context ready after ${Date.now() - scope.startedAt}ms`,
              )
            },
            onFirstAnswerChunk: () => {
              sendMcpProgress(40, 100, 'Receiving answer')
              mcpDebugLog(
                debugEnabled,
                `tool ask request ${scope.requestId} received first answer chunk after ${Date.now() - scope.startedAt}ms`,
              )
            },
            onChunk: (text) => {
              answer += text
              chunkCount += 1
              charCount += text.length
              if (chunkCount % 20 === 0) {
                const pct = Math.min(95, 40 + Math.floor(charCount / 80))
                sendMcpProgress(pct, 100, `Streaming: ${charCount} chars`)
                mcpDebugLog(
                  debugEnabled,
                  `tool ask request ${scope.requestId} streaming progress: chunks=${chunkCount}, chars=${charCount}, elapsedMs=${Date.now() - scope.startedAt}`,
                )
              }
            },
          }),
          timeoutMs,
          `Ask timed out after ${Math.round(timeoutMs / 1000)}s. Try narrowing scope with tag/entity, lowering maxContext, or using \`search\` first.`,
        )

        const finalAnswer = answer || result.rawAnswer
        scope.done(`chunks=${chunkCount}, chars=${finalAnswer.length}`)

        if (signal?.aborted) {
          mcpDebugLog(
            debugEnabled,
            `tool ask request ${scope.requestId} WARNING: response ready but abort signal was triggered — response may be dropped by SDK`,
          )
        }

        sendMcpProgress(100, 100, 'Complete')

        const sections: string[] = [finalAnswer]
        if (result.filedPath) {
          const filedRel = relative(requireKbRoot(), result.filedPath).replace(/\\/g, '/')
          sections.push(`---\n*Filed to: ${filedRel}*`)
        }
        if (result.rankedInfo?.wikiArticles.length) {
          const sources = result.rankedInfo.wikiArticles
            .map(a => `- ${a.title} (${a.path})`)
            .join('\n')
          sections.push(
            `---\n**Sources used (${result.rankedInfo.wikiArticles.length} of ${result.rankedInfo.totalWikiConsidered} considered):**\n${sources}`,
          )
        }
        if (debugEnabled) {
          sections.push(
            [
              '---',
              '**Debug diagnostics:**',
              `- requestId: ${scope.requestId}`,
              `- elapsedMs: ${Date.now() - scope.startedAt}`,
              `- chunks: ${chunkCount}`,
              `- outputChars: ${finalAnswer.length}`,
              `- maxContext: ${effectiveMaxContext}`,
              `- timeoutMs: ${timeoutMs}`,
              `- aborted: ${signal?.aborted ?? 'n/a'}`,
            ].join('\n'),
          )
        }

        const responseText = sections.filter(Boolean).join('\n\n')
        mcpDebugLog(
          debugEnabled,
          `tool ask request ${scope.requestId} returning ${responseText.length} char response to SDK`,
        )
        return { content: [{ type: 'text', text: responseText }] }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `Ask failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'wiki-stats',
    {
      title: 'Wiki Statistics',
      description: 'Get statistics about the knowledge base: article counts, word count, and configuration.',
      inputSchema: fromJsonSchema({ type: 'object' as const, properties: {} }),
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      const scope = createMcpRequestScope('tool', 'wiki-stats', isMcpDebugEnabled())
      try {
        const stats = getWikiStats()
        const config = readConfig()
        const name = getKbName(config)
        scope.done(`articles=${stats.articles}`)
        return {
          content: [{
            type: 'text',
            text: [
              `**${name}**`,
              `Provider: ${config.provider} / ${config.model}`,
              `Articles: ${stats.articles} total (${stats.sources} sources, ${stats.concepts} concepts)`,
              `Words: ${stats.words.toLocaleString()}`,
            ].join('\n'),
          }],
        }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `Stats failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'list-tags',
    {
      title: 'List Tags',
      description: 'List all tags in the knowledge base with article counts. Useful for discovering what the KB covers.',
      inputSchema: fromJsonSchema({ type: 'object' as const, properties: {} }),
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      const scope = createMcpRequestScope('tool', 'list-tags', isMcpDebugEnabled())
      try {
        const tags = getAllTagsWithCounts()
        if (tags.length === 0) {
          scope.done('tags=0')
          return { content: [{ type: 'text', text: 'No tags found. The wiki may not be compiled yet.' }] }
        }
        const text = tags.map(t => `#${t.tag} (${t.count} article${t.count !== 1 ? 's' : ''})`).join('\n')
        scope.done(`tags=${tags.length}`)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `List tags failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'list-entities',
    {
      title: 'List Entities',
      description:
        'List all named entities (people, places, organizations, creative works, etc.) with occurrence counts.',
      inputSchema: fromJsonSchema({ type: 'object' as const, properties: {} }),
      annotations: { readOnlyHint: true },
    },
    async (): Promise<CallToolResult> => {
      const scope = createMcpRequestScope('tool', 'list-entities', isMcpDebugEnabled())
      try {
        const entities = getAllEntitiesWithCounts()
        if (entities.length === 0) {
          scope.done('entities=0')
          return { content: [{ type: 'text', text: 'No entities found. The wiki may not be compiled yet.' }] }
        }
        const text = entities.map(e => `${e.entity} (${e.count})`).join('\n')
        scope.done(`entities=${entities.length}`)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `List entities failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )
}

// ── Resources ────────────────────────────────────────────────────────────────

function registerResources(server: McpServer): void {
  server.registerResource(
    'wiki-index',
    'theora://wiki/index',
    { title: 'Wiki Index', description: 'The knowledge base wiki index listing all articles.', mimeType: 'text/markdown' },
    async (uri) => {
      const scope = createMcpRequestScope('resource', 'wiki-index', isMcpDebugEnabled())
      try {
        const text = readWikiIndex()
        scope.done(`hasIndex=${text ? 'yes' : 'no'}`)
        return { contents: [{ uri: uri.href, text: text || '(Wiki index is empty — run `theora compile` to build it.)' }] }
      } catch (err) {
        scope.fail(err)
        throw err
      }
    },
  )

  // Individual articles are exposed via the `read-article` tool rather than
  // as resources.  Resource templates caused Cursor to enumerate + subscribe
  // to every article on connect (~600 POSTs for a large KB).
  server.registerTool(
    'read-article',
    {
      title: 'Read Article',
      description:
        'Read the full content of a wiki article by path. ' +
        'Use `search` first to discover article paths, then read specific ones for full text.',
      inputSchema: fromJsonSchema({
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description:
              'Article relative path from search results (e.g. "wiki/sources/my-article" or "wiki/concepts/my-concept" or "output/my-query"). ' +
              'Omit the .md extension.',
          },
        },
        required: ['path'],
      }),
      annotations: { readOnlyHint: true },
    },
    async (args): Promise<CallToolResult> => {
      const { path: articlePath } = args as { path: string }
      const debugEnabled = isMcpDebugEnabled()
      const scope = createMcpRequestScope('tool', 'read-article', debugEnabled)
      try {
        const normalized = articlePath.replace(/\.md$/, '')
        const kind = normalized.startsWith('wiki/sources/')
          ? 'sources' as const
          : normalized.startsWith('wiki/concepts/')
            ? 'concepts' as const
            : normalized.startsWith('output/')
              ? 'output' as const
              : null

        if (!kind) {
          scope.done(`path="${normalized}" → invalid prefix`)
          return {
            content: [{
              type: 'text',
              text: `Invalid path "${normalized}". Must start with wiki/sources/, wiki/concepts/, or output/.`,
            }],
            isError: true,
          }
        }

        const prefix = kind === 'output' ? 'output/' : `wiki/${kind}/`
        const slug = normalized.replace(prefix, '')
        const article = findArticleBySlug(slug, kind)

        if (!article) {
          scope.done(`path="${normalized}" → not found`)
          return {
            content: [{ type: 'text', text: `Article not found: ${normalized}` }],
            isError: true,
          }
        }

        const text = formatArticleResource(article)
        scope.done(`path="${normalized}" → ${text.length} chars`)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        scope.fail(err)
        return {
          content: [{ type: 'text', text: `Read failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        }
      }
    },
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugFromRelativePath(relativePath: string, prefix: string): string {
  return relativePath
    .replace(prefix, '')
    .replace(/\.md$/, '')
}

function findArticleBySlug(slug: string, kind: 'sources' | 'concepts' | 'output') {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const basePath = kind === 'output' ? paths.output : kind === 'sources' ? paths.wikiSources : paths.wikiConcepts
  const prefix = kind === 'output' ? 'output/' : `wiki/${kind}/`

  return listWikiArticles().find(a => {
    if (!a.path.startsWith(basePath)) return false
    const articleSlug = slugFromRelativePath(a.relativePath, prefix)
    return articleSlug === slug
  })
}

function formatArticleResource(article: { title: string; content: string; tags: string[]; frontmatter: Record<string, unknown> }): string {
  const header = [`# ${article.title}`]
  if (article.tags.length) header.push(`Tags: ${article.tags.join(', ')}`)
  const fm = article.frontmatter
  if (fm.ontology) header.push(`Ontology: ${Array.isArray(fm.ontology) ? fm.ontology.join(', ') : fm.ontology}`)
  if (fm.source_url) header.push(`Source: ${fm.source_url}`)
  return header.join('\n') + '\n\n' + article.content
}
