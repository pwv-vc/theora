import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { streamSSE } from 'hono/streaming'
import { marked } from 'marked'
import { requireKbRoot, kbPaths } from '../lib/paths.js'
import { listWikiArticles, readWikiIndex, getAllTagsWithCounts } from '../lib/wiki.js'
import { findRelevantArticles, buildContext } from '../lib/query.js'
import { llmStream } from '../lib/llm.js'
import { searchArticles } from '../lib/search.js'
import { compileSources, extractConcepts, rebuildIndex } from '../lib/compiler.js'
import { MD_SYSTEM, buildMdUserPrompt } from '../lib/prompts.js'
import { normalizeLinks } from '../lib/wiki.js'
import { readManifest, writeManifest } from '../lib/manifest.js'
import { ingestWebFile, ingestWebUrl } from '../lib/ingest.js'
import { Layout } from './templates/layout.js'
import { HomePage } from './templates/home.js'
import { ArticlePage } from './templates/article.js'
import { SearchPage, SearchResults } from './templates/search.js'
import { AskPage } from './templates/ask.js'
import { CompilePage } from './templates/compile.js'
import { ConceptsPage } from './templates/concepts.js'
import { QueriesPage } from './templates/queries.js'
import { IngestPage } from './templates/ingest.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function startServer(port: number): void {
  const app = new Hono()

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

    const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
    const tagsWithCounts = getAllTagsWithCounts()

    const configPath = join(root, '.theora', 'config.json')
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { name: 'Knowledge Base' }

    return c.html(
      Layout({
        title: `Concepts — ${config.name ?? 'Knowledge Base'}`,
        active: 'concepts',
        children: ConceptsPage({ concepts, tagsWithCounts, activeTag }),
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
        children: QueriesPage({ queries, tagsWithCounts, activeTag }),
      }).toString()
    )
  })

  app.get('/wiki/:type/:slug', (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const { type, slug } = c.req.param()

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

    const html = marked.parse(article.content) as string

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

    const filePath = join(paths.output, `${slug}.md`)
    if (!existsSync(filePath)) return c.notFound()

    const articles = listWikiArticles()
    const article = articles.find(a => a.path === filePath)
    if (!article) return c.notFound()

    const html = marked.parse(article.content) as string

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

    return c.html(
      Layout({
        title: 'Search',
        active: 'search',
        children: SearchPage({ q, tag, tagsWithCounts }),
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
    return c.html(
      Layout({
        title: 'Ask',
        active: 'ask',
        children: AskPage({ tagsWithCounts }),
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
        const index = readWikiIndex()
        let articles = listWikiArticles()

        const tag = c.req.query('tag')
        if (tag) {
          articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === tag.toLowerCase()))
        }

        const relevant = await findRelevantArticles(question, index, articles)
        const context = buildContext(relevant)
        const prompt = buildMdUserPrompt(question, index, context)

        const fullAnswer = await llmStream(
          prompt,
          { system: MD_SYSTEM, maxTokens: 8192 },
          (text) => {
            stream.writeSSE({ data: text }).catch(() => {})
          },
        )

        const normalized = normalizeLinks(fullAnswer, articles)
        await stream.writeSSE({ event: 'done', data: normalized })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await stream.writeSSE({ event: 'error', data: msg })
      }
    })
  })

  app.get('/ingest', (c) => {
    return c.html(
      Layout({
        title: 'Ingest',
        active: 'ingest',
        children: IngestPage(),
      }).toString()
    )
  })

  app.post('/ingest/upload', async (c) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const body = await c.req.parseBody({ all: true })

    const tag = typeof body['tag'] === 'string' ? body['tag'].trim() || null : null
    const destDir = tag ? join(paths.raw, tag) : paths.raw
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
    return c.html(
      Layout({
        title: 'Compile',
        active: 'compile',
        children: CompilePage({ ingestedCount, ingestedFiles }),
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
        const paths = kbPaths(root)

        const onProgress = async (msg: string) => {
          await stream.writeSSE({ data: msg })
        }

        if (force) {
          if (existsSync(paths.wikiSources)) rmSync(paths.wikiSources, { recursive: true, force: true })
          if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
          await stream.writeSSE({ data: 'Cleared existing wiki articles — recompiling from scratch' })
        }

        if (conceptsOnly) {
          if (existsSync(paths.wikiConcepts)) rmSync(paths.wikiConcepts, { recursive: true, force: true })
          await stream.writeSSE({ data: 'Cleared existing concepts — regenerating from compiled sources' })
          await extractConcepts(root, undefined, onProgress)
          await rebuildIndex(root, onProgress)
        } else {
          await compileSources(root, undefined, onProgress)
          if (!sourcesOnly) {
            await extractConcepts(root, undefined, onProgress)
          }
          await rebuildIndex(root, onProgress)
        }

        await stream.writeSSE({ event: 'done', data: 'Compilation complete' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await stream.writeSSE({ event: 'error', data: msg })
      }
    })
  })

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`  http://localhost:${info.port}`)
  })
}
