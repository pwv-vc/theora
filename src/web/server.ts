import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { streamSSE } from 'hono/streaming'
import { secureHeaders } from 'hono/secure-headers'
import { marked, Renderer } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { requireKbRoot, kbPaths, safeJoin } from '../lib/paths.js'
import { listWikiArticles, readWikiIndex, getAllTagsWithCounts } from '../lib/wiki.js'
import { findRelevantArticles, buildContext } from '../lib/query.js'
import { llmStream } from '../lib/llm.js'
import { searchArticles } from '../lib/search.js'
import { runCompile } from '../lib/compile.js'
import { MD_SYSTEM, buildMdUserPrompt } from '../lib/prompts/index.js'
import { normalizeLinksForWeb } from '../lib/wiki.js'
import { streamAsk } from '../lib/ask.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { ingestWebFile, ingestWebUrl } from '../lib/ingest.js'
import { escapeHtml } from '../lib/utils.js'
import { Layout } from './templates/layout.js'
import { HomePage } from './templates/home.js'
import { ArticlePage } from './templates/article.js'
import { SearchPage, SearchResults } from './templates/search.js'
import { AskPage } from './templates/ask.js'
import { CompilePage } from './templates/compile.js'
import { ConceptsPage } from './templates/concepts.js'
import { QueriesPage } from './templates/queries.js'
import { IngestPage } from './templates/ingest.js'
import { StatsPage } from './templates/stats.js'
import { AboutPage } from './templates/about.js'
import { readLlmLogs, summarizeStats } from '../lib/llm-stats.js'
import { settingsRoutes } from './routes/settings.js'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'pre', 'details', 'summary',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'a': ['href', 'title', 'target', 'rel'],
    'code': ['class'],
    'div': ['class'],
    'span': ['class'],
    'pre': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

function parseMarkdown(content: string): string {
  const renderer = new Renderer()
  const originalCode = renderer.code.bind(renderer)
  renderer.code = function(token) {
    if (token.lang === 'mermaid') {
      return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`
    }
    return originalCode(token)
  }
  const raw = marked.parse(content, { renderer }) as string
  return sanitizeHtml(raw, SANITIZE_OPTIONS)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function startServer(port: number): void {
  const app = new Hono()

  // Mount settings routes before other routes
  app.route('/settings', settingsRoutes)

  app.use('*', secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://unpkg.com',
        'https://cdn.jsdelivr.net',
        "'unsafe-inline'",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }))

  app.get('/static/styles.css', (c) => {
    const cssPath = join(__dirname, 'web', 'static', 'styles.css')
    if (!existsSync(cssPath)) {
      return c.text('/* CSS not built — run pnpm build */', 200, { 'Content-Type': 'text/css' })
    }
    const css = readFileSync(cssPath, 'utf-8')
    return c.text(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
  })

  app.get('/static/logo.svg', (c) => {
    const svgPath = join(__dirname, 'web', 'static', 'logo.svg')
    if (!existsSync(svgPath)) return c.notFound()
    const svg = readFileSync(svgPath, 'utf-8')
    return c.text(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
  })

  // Serve raw files (images, PDFs, etc.) from the raw/ directory
  app.get('/raw/:filepath{.+}', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const rawPath = c.req.param('filepath') ?? ''

    try {
      const filePath = safeJoin(paths.raw, rawPath)
      if (!existsSync(filePath)) return c.notFound()

      // Check if path is actually a file (not a directory)
      const stats = statSync(filePath)
      if (!stats.isFile()) return c.notFound()

      // Determine content type based on extension
      const ext = filePath.toLowerCase().split('.').pop() || ''
      const contentTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'json': 'application/json',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
      }
      const contentType = contentTypes[ext] || 'application/octet-stream'

      // Generate ETag based on file modification time and size
      const etag = `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`

      // Check If-None-Match header for conditional requests
      const ifNoneMatch = c.req.header('If-None-Match')
      if (ifNoneMatch === etag) {
        return c.body(null, 304)
      }

      const fileBuffer = readFileSync(filePath)
      return c.body(fileBuffer, 200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'ETag': etag,
      })
    } catch (err) {
      // Distinguish between different error types
      if (err instanceof Error) {
        if (err.message.includes('ENOENT')) {
          return c.notFound()
        }
        if (err.message.includes('EACCES') || err.message.includes('EPERM')) {
          return c.json({ error: 'Access denied' }, 403)
        }
      }
      return c.notFound()
    }
  })

  app.get('/', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const activeTag = c.req.query('tag') ?? ''
    let articles = listWikiArticles()

    if (activeTag) {
      articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()))
    }

    const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
    const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
    const queries = articles.filter(a => a.path.startsWith(paths.output))
    const tagsWithCounts = getAllTagsWithCounts()

    const statsPath = join(root, '.theora', 'stats.json')
    const stats = existsSync(statsPath)
      ? JSON.parse(readFileSync(statsPath, 'utf-8'))
      : null

    const configPath = join(root, '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: config.name ?? 'Knowledge Base',
        active: 'home',
        children: HomePage({ sources, concepts, queries, tagsWithCounts, activeTag, stats, config }),
      }).toString()
    )
  })

  app.get('/wiki/concepts', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const activeTag = c.req.query('tag') ?? ''
    let articles = listWikiArticles()

    if (activeTag) {
      articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()))
    }

    const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
    const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
    const queries = articles.filter(a => a.path.startsWith(paths.output))
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(root, '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: `Concepts — ${config.name ?? 'Knowledge Base'}`,
        active: 'concepts',
        children: ConceptsPage({ concepts, sources, queries, tagsWithCounts, activeTag, config }),
      }).toString()
    )
  })

  app.get('/wiki/queries', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const activeTag = c.req.query('tag') ?? ''
    let articles = listWikiArticles()

    if (activeTag) {
      articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()))
    }

    const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
    const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
    const queries = articles.filter(a => a.path.startsWith(paths.output))
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(root, '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: `Queries — ${config.name ?? 'Knowledge Base'}`,
        active: 'queries',
        children: QueriesPage({ queries, sources, concepts, tagsWithCounts, activeTag, config }),
      }).toString()
    )
  })

  app.get('/wiki/:type/:slug', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const { type, slug } = c.req.param()

    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return c.notFound()

    const dirMap: Record<string, string> = {
      sources: paths.wikiSources,
      concepts: paths.wikiConcepts,
    }
    const dir = dirMap[type]
    if (!dir) return c.notFound()

    const filePath = join(dir, `${slug}.md`)
    if (!existsSync(filePath)) return c.notFound()

    const articles = listWikiArticles()
    const article = articles.find(a => a.path === filePath)
    if (!article) return c.notFound()

    const html = parseMarkdown(normalizeLinksForWeb(article.content, articles))

    return c.html(
      Layout({
        title: article.title,
        active: 'home',
        children: ArticlePage({ article, html }),
      }).toString()
    )
  })

  app.get('/output/:slug', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const { slug } = c.req.param()

    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return c.notFound()

    const filePath = join(paths.output, `${slug}.md`)
    if (!existsSync(filePath)) return c.notFound()

    const articles = listWikiArticles()
    const article = articles.find(a => a.path === filePath)
    if (!article) return c.notFound()

    const html = parseMarkdown(normalizeLinksForWeb(article.content, articles))

    return c.html(
      Layout({
        title: article.title,
        active: 'home',
        children: ArticlePage({ article, html }),
      }).toString()
    )
  })

  app.get('/search', (c) => {
    const q = c.req.query('q') ?? ''
    const tag = c.req.query('tag') ?? ''
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: 'Search',
        active: 'search',
        children: SearchPage({ q, tag, tagsWithCounts, config }),
      }).toString()
    )
  })

  app.get('/search/results', (c) => {
    const q = c.req.query('q') ?? ''
    const tag = c.req.query('tag') ?? ''

    if (!q.trim() && !tag) {
      return c.html('<div></div>')
    }

    const results = searchArticles(q, tag || undefined).slice(0, 20)
    return c.html(SearchResults({ results, q, tag }).toString())
  })

  app.get('/ask', (c) => {
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: 'Ask',
        active: 'ask',
        children: AskPage({ tagsWithCounts, config }),
      }).toString()
    )
  })

  app.get('/ask/stream', async (c) => {
    const question = c.req.query('q') ?? ''
    if (!question.trim()) {
      return c.json({ error: 'No question provided' }, 400)
    }

    return streamSSE(c, async (stream) => {
      try {
        const tag = c.req.query('tag') || undefined
        const { rawAnswer } = await streamAsk(question, {
          tag,
          file: true,
          onChunk: (text) => { stream.writeSSE({ data: text }).catch(() => {}) },
        })

        const allArticles = listWikiArticles()
        const normalized = normalizeLinksForWeb(rawAnswer, allArticles)
        await stream.writeSSE({ event: 'done', data: normalized })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await stream.writeSSE({ event: 'error', data: msg })
      }
    })
  })

  app.get('/ingest', (c) => {
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: 'Ingest',
        active: 'ingest',
        children: IngestPage({ tagsWithCounts, config }),
      }).toString()
    )
  })

  app.post('/ingest/upload', async (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const body = await c.req.parseBody({ all: true })

    const tag = typeof body['tag'] === 'string' ? body['tag'].trim() || null : null
    if (tag && !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
      return c.json({ error: 'Invalid tag — use lowercase letters, numbers, and hyphens only' }, 400)
    }
    const destDir = tag ? safeJoin(paths.raw, tag) : paths.raw
    mkdirSync(destDir, { recursive: true })

    const entries = readManifest()
    const existingNames = new Set(entries.map(e => e.name))

    const ingestedEntries: { name: string; tag: string | null; url?: string }[] = []
    const errors: string[] = []
    const ingestedNames: string[] = []

    const rawFiles = body['files']
    const fileList = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : []
    for (const f of fileList) {
      if (f instanceof File) {
        const result = await ingestWebFile(f, destDir, existingNames)
        if (result.status === 'ingested') {
          ingestedEntries.push({ name: result.name, tag })
          ingestedNames.push(result.name)
        } else if (result.status === 'error' || result.status === 'skipped_type' || result.status === 'skipped_size') {
          if (result.error) errors.push(result.error)
        }
      }
    }

    const urlsRaw = typeof body['urls'] === 'string' ? body['urls'] : ''
    const urls = urlsRaw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
    for (const url of urls) {
      const result = await ingestWebUrl(url, destDir, existingNames)
      if (result.status === 'ingested') {
        ingestedEntries.push({ name: result.name, tag, url })
        ingestedNames.push(result.name)
      } else if (result.status === 'error') {
        if (result.error) errors.push(result.error)
      }
    }

    if (ingestedEntries.length > 0) {
      const now = new Date().toISOString()
      for (const entry of ingestedEntries) {
        entries.push({ name: entry.name, ingested: now, tag: entry.tag, url: entry.url })
      }
      writeManifest(entries)
    }

    return c.json({
      ingested: ingestedNames.length,
      skipped: fileList.filter(f => f instanceof File).length + urls.length - ingestedNames.length - errors.length,
      files: ingestedNames,
      errors,
    })
  })

  app.get('/compile', (c) => {
    const ingestedCount = parseInt(c.req.query('ingested') ?? '0', 10)
    const ingestedFiles = c.req.query('files') ?? ''

    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: 'Compile',
        active: 'compile',
        children: CompilePage({ ingestedCount, ingestedFiles, config }),
      }).toString()
    )
  })

  app.post('/compile/run', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const force = body.force === true
    const sourcesOnly = body.sourcesOnly === true
    const conceptsOnly = body.conceptsOnly === true

    return streamSSE(c, async (stream) => {
      try {
        const root = requireKbRoot()

        await runCompile(
          root,
          { force, sourcesOnly, conceptsOnly },
          async (msg) => { await stream.writeSSE({ data: msg }) },
        )

        await stream.writeSSE({ event: 'done', data: 'Compilation complete' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await stream.writeSSE({ event: 'error', data: msg })
      }
    })
  })

  app.get('/stats', (c) => {
    const logs = readLlmLogs()
    const days = parseInt(c.req.query('days') ?? '30', 10)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoff)
    const summary = summarizeStats(filteredLogs)

    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    // Get last 10 logs for initial display
    const recentLogs = logs.slice(-10)

    return c.html(
      Layout({
        title: `Stats — ${config.name ?? 'Knowledge Base'}`,
        active: 'stats',
        children: StatsPage({ summary, days, recentLogs, config }),
      }).toString()
    )
  })

  app.get('/api/logs/stream', (c) => {
    return streamSSE(c, async (stream) => {
      let lastCount = readLlmLogs().length
      let aborted = false

      // Handle abort signal
      c.req.raw.signal?.addEventListener('abort', () => {
        aborted = true
      })

      // Send initial heartbeat to establish connection
      await stream.writeSSE({ data: JSON.stringify({ type: 'connected' }) })

      while (!aborted) {
        try {
          const logs = readLlmLogs()
          if (logs.length > lastCount) {
            const newEntries = logs.slice(lastCount)
            for (const log of newEntries) {
              await stream.writeSSE({ data: JSON.stringify(log) })
            }
            lastCount = logs.length
          }
        } catch (e) {
          // Client disconnected or error
          break
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    })
  })

  app.get('/about', (c) => {
    const configPath = join(requireKbRoot(), '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: `About — ${config.name ?? 'Knowledge Base'}`,
        active: 'home',
        children: AboutPage({ config }),
      }).toString()
    )
  })

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`  http://localhost:${info.port}`)
  })
}

