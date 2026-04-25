import { McpServer, ResourceTemplate, fromJsonSchema } from '@modelcontextprotocol/server'
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

const VERSION = '0.0.1'

export function createTheoraMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'theora', version: VERSION },
    {
      instructions: [
        'Theora is an LLM-powered knowledge base that turns raw research into a living wiki.',
        'Use `search` to find articles by keyword (BM25 full-text search).',
        'Use `ask` to get an AI-synthesized answer grounded in the wiki.',
        'Browse `theora://wiki/sources/*` and `theora://wiki/concepts/*` resources for raw article content.',
        'Use `list-tags` and `list-entities` to discover what the KB covers before querying.',
        'Prefer searching before asking — search is instant, ask invokes an LLM.',
      ].join(' '),
      capabilities: { logging: {} },
    },
  )

  registerTools(server)
  registerResources(server)

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
      try {
        const { results, suggestedQuery } = searchArticles(query, tag, entity)
        const limited = results.slice(0, limit ?? 10)

        if (limited.length === 0) {
          const hint = suggestedQuery ? `\nDid you mean: "${suggestedQuery}"` : ''
          return { content: [{ type: 'text', text: `No results for "${query}".${hint}` }] }
        }

        const lines = limited.map((r, i) => {
          const score = Number.isFinite(r.score) ? r.score.toFixed(3) : '—'
          const tags = r.tags.length ? ` [${r.tags.join(', ')}]` : ''
          return `${i + 1}. **${r.title}** (${r.relativePath})${tags}\n   Score: ${score}\n   ${r.snippet}`
        })

        const header = `${limited.length} result(s) for "${query}"` +
          (suggestedQuery ? `\nDid you mean: "${suggestedQuery}"` : '')

        return { content: [{ type: 'text', text: `${header}\n\n${lines.join('\n\n')}` }] }
      } catch (err) {
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
        'This invokes an LLM call — prefer `search` for simple lookups.',
      inputSchema: fromJsonSchema({
        type: 'object' as const,
        properties: {
          question: { type: 'string', description: 'The question to ask' },
          tag: { type: 'string', description: 'Filter wiki articles by tag' },
          entity: { type: 'string', description: 'Filter by entity (format: type/name)' },
          maxContext: { type: 'number', description: 'Max wiki articles to include in context' },
        },
        required: ['question'],
      }),
    },
    async (args): Promise<CallToolResult> => {
      const { question, tag, entity, maxContext } = args as { question: string; tag?: string; entity?: string; maxContext?: number };
      try {
        let answer = ''
        const result = await streamAsk(question, {
          tag,
          entity,
          file: false,
          maxContext,
          onChunk: (text) => { answer += text },
        })

        const parts: { type: 'text'; text: string }[] = [{ type: 'text', text: answer }]

        if (result.rankedInfo?.wikiArticles.length) {
          const sources = result.rankedInfo.wikiArticles
            .map(a => `- ${a.title} (${a.path})`)
            .join('\n')
          parts.push({ type: 'text', text: `\n---\n**Sources used (${result.rankedInfo.wikiArticles.length} of ${result.rankedInfo.totalWikiConsidered} considered):**\n${sources}` })
        }

        return { content: parts }
      } catch (err) {
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
      try {
        const stats = getWikiStats()
        const config = readConfig()
        const name = getKbName(config)
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
      const tags = getAllTagsWithCounts()
      if (tags.length === 0) {
        return { content: [{ type: 'text', text: 'No tags found. The wiki may not be compiled yet.' }] }
      }
      const text = tags.map(t => `#${t.tag} (${t.count} article${t.count !== 1 ? 's' : ''})`).join('\n')
      return { content: [{ type: 'text', text }] }
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
      const entities = getAllEntitiesWithCounts()
      if (entities.length === 0) {
        return { content: [{ type: 'text', text: 'No entities found. The wiki may not be compiled yet.' }] }
      }
      const text = entities.map(e => `${e.entity} (${e.count})`).join('\n')
      return { content: [{ type: 'text', text }] }
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
      const text = readWikiIndex()
      return { contents: [{ uri: uri.href, text: text || '(Wiki index is empty — run `theora compile` to build it.)' }] }
    },
  )

  server.registerResource(
    'wiki-source',
    new ResourceTemplate('theora://wiki/sources/{slug}', {
      list: async () => {
        const root = requireKbRoot()
        const paths = kbPaths(root)
        const articles = listWikiArticles().filter(a => a.path.startsWith(paths.wikiSources))
        return {
          resources: articles.map(a => ({
            uri: `theora://wiki/sources/${slugFromRelativePath(a.relativePath, 'wiki/sources/')}`,
            name: a.title,
            description: a.tags.length ? `Tags: ${a.tags.join(', ')}` : undefined,
          })),
        }
      },
    }),
    { title: 'Wiki Source Article', description: 'A compiled source article from the knowledge base.', mimeType: 'text/markdown' },
    async (uri, { slug }) => {
      const article = findArticleBySlug(slug as string, 'sources')
      if (!article) throw new Error(`Source not found: ${slug}`)
      return { contents: [{ uri: uri.href, text: formatArticleResource(article) }] }
    },
  )

  server.registerResource(
    'wiki-concept',
    new ResourceTemplate('theora://wiki/concepts/{slug}', {
      list: async () => {
        const root = requireKbRoot()
        const paths = kbPaths(root)
        const articles = listWikiArticles().filter(a => a.path.startsWith(paths.wikiConcepts))
        return {
          resources: articles.map(a => ({
            uri: `theora://wiki/concepts/${slugFromRelativePath(a.relativePath, 'wiki/concepts/')}`,
            name: a.title,
            description: a.tags.length ? `Tags: ${a.tags.join(', ')}` : undefined,
          })),
        }
      },
    }),
    { title: 'Wiki Concept Article', description: 'A concept article extracted during compilation.', mimeType: 'text/markdown' },
    async (uri, { slug }) => {
      const article = findArticleBySlug(slug as string, 'concepts')
      if (!article) throw new Error(`Concept not found: ${slug}`)
      return { contents: [{ uri: uri.href, text: formatArticleResource(article) }] }
    },
  )

  server.registerResource(
    'wiki-query',
    new ResourceTemplate('theora://output/{slug}', {
      list: async () => {
        const root = requireKbRoot()
        const paths = kbPaths(root)
        const articles = listWikiArticles().filter(a => a.path.startsWith(paths.output))
        return {
          resources: articles.map(a => ({
            uri: `theora://output/${slugFromRelativePath(a.relativePath, 'output/')}`,
            name: a.title,
          })),
        }
      },
    }),
    { title: 'Previous Query Result', description: 'A previously filed ask result from the output directory.', mimeType: 'text/markdown' },
    async (uri, { slug }) => {
      const article = findArticleBySlug(slug as string, 'output')
      if (!article) throw new Error(`Query result not found: ${slug}`)
      return { contents: [{ uri: uri.href, text: formatArticleResource(article) }] }
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
