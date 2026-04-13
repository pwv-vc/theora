import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import { requireKbRoot, kbPaths } from '../../lib/paths.js'
import { listWikiArticles, normalizeLinksForWeb } from '../../lib/wiki.js'
import { readConfig } from '../../lib/config.js'
import { loadWikiNavLists } from '../../lib/wiki-nav.js'
import { parseMarkdown } from '../../lib/markdown-web.js'
import { parseOntologyQueryParam, parseWikiMapQuery } from '../../lib/wikiMap/webQuery.js'
import {
  computeWikiMapWebGraph,
  buildWikiMapGraph,
} from '../../lib/wikiMap/index.js'
import type { WikiMapGraph } from '../../lib/wikiMap/index.js'
import { Layout } from '../pages/layout.js'
import { ArticlePage } from '../pages/article.js'
import { ConceptsPage } from '../pages/concepts.js'
import { QueriesPage } from '../pages/queries.js'
import { MapPage } from '../pages/map.js'

export const wikiRoutes = new Hono()

wikiRoutes.get('/concepts', (c) => {
  const activeTag = c.req.query('tag') ?? ''
  const { sources, concepts, queries, tagsWithCounts } = loadWikiNavLists(activeTag)
  const config = readConfig()

  return c.html(
    Layout({
      title: `Concepts — ${config.name ?? 'Knowledge Base'}`,
      active: 'concepts',
      children: ConceptsPage({ concepts, sources, queries, tagsWithCounts, activeTag, config: config as unknown as Record<string, unknown> }),
    }).toString(),
  )
})

wikiRoutes.get('/queries', (c) => {
  const activeTag = c.req.query('tag') ?? ''
  const { sources, concepts, queries, tagsWithCounts } = loadWikiNavLists(activeTag)
  const config = readConfig()

  return c.html(
    Layout({
      title: `Queries — ${config.name ?? 'Knowledge Base'}`,
      active: 'queries',
      children: QueriesPage({ queries, sources, concepts, tagsWithCounts, activeTag, config: config as unknown as Record<string, unknown> }),
    }).toString(),
  )
})

wikiRoutes.get('/map/graph.json', (c) => {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const articles = listWikiArticles()
  const parsed = parseWikiMapQuery((name) => c.req.query(name))
  if (parsed.error) return c.json({ error: parsed.error }, 400)

  const ontologyFilter = parseOntologyQueryParam(parsed.ontologyRaw || undefined)
  const result = computeWikiMapWebGraph({
    paths,
    articles,
    aroundRaw: parsed.aroundRaw,
    tagRaw: parsed.tagRaw,
    entityRaw: parsed.entityRaw,
    ontologyFilter,
    depth: parsed.depth,
    maxNodes: parsed.maxNodes,
    bridgeCap: parsed.bridgeCap,
  })

  if (result.error) return c.json({ error: result.error }, 400)
  if (!result.graph) {
    const config = readConfig()
    const kbName = config.name ?? 'Knowledge Base'
    const overview = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'overview' as const, kbName },
      depth: 4,
      maxNodes: parsed.maxNodes,
      bridgeCap: parsed.bridgeCap,
    })
    return c.json({ graph: overview, focal: null })
  }

  return c.json({
    graph: result.graph,
    focal: parsed.aroundRaw || parsed.tagRaw || null,
  })
})

wikiRoutes.get('/map', (c) => {
  const paths = kbPaths(requireKbRoot())
  const articles = listWikiArticles()
  const parsed = parseWikiMapQuery((name) => c.req.query(name))

  const config = readConfig()
  const kbName = config.name ?? 'Knowledge Base'

  const ontologyFilter = parseOntologyQueryParam(parsed.ontologyRaw || undefined)
  let graph = null as WikiMapGraph | null
  let error = parsed.error

  if (!error && (parsed.aroundRaw || parsed.tagRaw || parsed.entityRaw)) {
    const result = computeWikiMapWebGraph({
      paths,
      articles,
      aroundRaw: parsed.aroundRaw,
      tagRaw: parsed.tagRaw,
      entityRaw: parsed.entityRaw,
      ontologyFilter,
      depth: parsed.depth,
      maxNodes: parsed.maxNodes,
      bridgeCap: parsed.bridgeCap,
    })
    error = result.error
    graph = result.graph
  }

  if (!graph && !error) {
    graph = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'overview' as const, kbName },
      depth: 4,
      maxNodes: parsed.maxNodes,
      bridgeCap: parsed.bridgeCap,
    })
  }

  return c.html(
    Layout({
      title: `Map — ${kbName}`,
      active: 'map',
        children: MapPage({
        config: config as unknown as Record<string, unknown>,
        graph,
        error: error || '',
        around: parsed.aroundRaw,
        tag: parsed.tagRaw,
        entity: parsed.entityRaw,
        ontology: parsed.ontologyRaw,
        depth: parsed.depth,
        maxNodes: parsed.maxNodes,
        bridgeCap: parsed.bridgeCap,
      }),
    }).toString(),
  )
})

wikiRoutes.get('/:type/:slug', (c) => {
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
    }).toString(),
  )
})

export const outputRoutes = new Hono()

/** LLM/user mistake: wiki articles live under /wiki/, not under /output/wiki/. */
outputRoutes.get('/wiki/:type/:slug', (c) => {
  const { type, slug: slugRaw } = c.req.param()
  if (type !== 'sources' && type !== 'concepts') return c.notFound()
  let slug = slugRaw
  if (slug.toLowerCase().endsWith('.md')) slug = slug.slice(0, -3)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return c.notFound()
  return c.redirect(`/wiki/${type}/${slug}`, 302)
})

outputRoutes.get('/:slug', (c) => {
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
    }).toString(),
  )
})
