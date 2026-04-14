import { basename } from 'node:path'
import type { KbPaths } from '../paths.js'
import type { WikiArticle } from '../wiki.js'
import type { OntologyType } from '../wiki.js'
import { ONTOLOGY_TYPES } from '../wiki.js'
import { normalizeTag } from '../utils.js'

export type WikiMapNodeKind = 'focal' | 'concept' | 'source' | 'query' | 'tag' | 'entity' | 'ontology'

export interface WikiMapNode {
  /** Stable key for deduping */
  key: string
  label: string
  kind: WikiMapNodeKind
  /** Article path when kind is article-ish */
  articlePath?: string
  /** Web route for the article (e.g. /wiki/concepts/slug) */
  webUrl?: string
  /** Article slug for refocusing */
  slug?: string
}

export interface WikiMapEdge {
  fromKey: string
  toKey: string
  relation: 'related_source' | 'cited_by' | 'tag' | 'entity' | 'ontology' | 'tag_center'
}

export interface WikiMapGraph {
  nodes: WikiMapNode[]
  edges: WikiMapEdge[]
}

export type WikiMapCenter =
  | { type: 'article'; slug: string }
  | { type: 'tag'; tag: string }
  | { type: 'entity'; entityKey: string }
  | { type: 'overview'; kbName: string }

export interface WikiMapBuildOptions {
  paths: KbPaths
  articles: WikiArticle[]
  center: WikiMapCenter
  depth: number
  maxNodes: number
  /** Max articles discovered through each shared tag or entity per hop. Higher = richer but bigger graph. Default 5. */
  bridgeCap?: number
  /** When set, only articles with this tag are included (focal article exempt if article center). Tag center ignores this. */
  tagFilter?: string
  /** Concepts must declare this ontology; sources/queries always allowed when reached. */
  ontologyFilter?: OntologyType
}

export function articleSlug(article: WikiArticle): string {
  return basename(article.path, '.md').toLowerCase()
}

function articleKind(paths: KbPaths, article: WikiArticle): WikiMapNodeKind {
  if (article.path.startsWith(paths.wikiConcepts)) return 'concept'
  if (article.path.startsWith(paths.wikiSources)) return 'source'
  if (article.path.startsWith(paths.output)) return 'query'
  return 'concept'
}

function articleWebUrl(paths: KbPaths, article: WikiArticle): string {
  const slug = articleSlug(article)
  if (article.path.startsWith(paths.wikiConcepts)) return `/wiki/concepts/${slug}`
  if (article.path.startsWith(paths.wikiSources)) return `/wiki/sources/${slug}`
  if (article.path.startsWith(paths.output)) return `/output/${slug}`
  return `/wiki/concepts/${slug}`
}

function parseRelatedSourceSlugs(fm: Record<string, unknown>): string[] {
  // Support both related_sources (concepts) and cited_sources (queries)
  const raw = fm.related_sources ?? fm.cited_sources
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const s = String(item).trim()
    const m = /^\[\[([^\]]+)\]\]$/.exec(s)
    const inner = m ? m[1] : s
    const file = inner.includes('/') ? inner.split('/').pop()! : inner
    const slug = basename(file, '.md').toLowerCase().replace(/\s+/g, '-')
    if (slug) out.push(slug)
  }
  return out
}

function parseRelatedConceptSlugs(fm: Record<string, unknown>): string[] {
  const raw = fm.related_concepts
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const s = String(item).trim()
    const m = /^\[\[([^\]]+)\]\]$/.exec(s)
    const inner = m ? m[1] : s
    const file = inner.includes('/') ? inner.split('/').pop()! : inner
    const slug = basename(file, '.md').toLowerCase().replace(/\s+/g, '-')
    if (slug) out.push(slug)
  }
  return out
}

function ontologyFromFrontmatter(fm: Record<string, unknown>): string[] {
  const raw = fm.ontology
  if (!Array.isArray(raw)) return []
  return raw.map((x) => String(x).toLowerCase())
}

function passesOntologyFilter(
  paths: KbPaths,
  article: WikiArticle,
  filter: OntologyType | undefined,
): boolean {
  if (!filter) return true
  if (!article.path.startsWith(paths.wikiConcepts)) return true
  return ontologyFromFrontmatter(article.frontmatter).includes(filter)
}

function passesTagFilter(article: WikiArticle, tagFilter: string | undefined, isFocal: boolean): boolean {
  if (!tagFilter) return true
  if (isFocal) return true
  const want = normalizeTag(tagFilter)
  return article.tags.some((t) => normalizeTag(t) === want)
}

function findArticleBySlug(articles: WikiArticle[], slug: string): WikiArticle | undefined {
  const s = slug.toLowerCase()
  const matches = articles.filter((a) => articleSlug(a) === s)
  if (matches.length === 0) return undefined
  const rank = (a: WikiArticle) => {
    if (a.path.includes('/concepts/')) return 0
    if (a.path.includes('/sources/')) return 1
    return 2
  }
  matches.sort((a, b) => rank(a) - rank(b))
  return matches[0]
}

function buildSourceToConcepts(articles: WikiArticle[], paths: KbPaths): Map<string, WikiArticle[]> {
  const map = new Map<string, WikiArticle[]>()
  for (const a of articles) {
    if (!a.path.startsWith(paths.wikiConcepts)) continue
    for (const slug of parseRelatedSourceSlugs(a.frontmatter)) {
      const list = map.get(slug) ?? []
      list.push(a)
      map.set(slug, list)
    }
  }
  return map
}

/**
 * Deterministic focal graph: concept↔source links, tags, entities, ontology.
 * Tags and entities act as bridge nodes — BFS traverses through shared tags
 * and entities to discover connected articles across the graph.
 * Queries are treated like concepts (they also declare related_sources).
 * Visualizers consume this structure only — no rendering assumptions here.
 */
export function buildWikiMapGraph(options: WikiMapBuildOptions): WikiMapGraph {
  const { paths, articles, center, depth, maxNodes, tagFilter, ontologyFilter } = options
  const bridgeCap = options.bridgeCap ?? 5
  const sourceToConcepts = buildSourceToConcepts(articles, paths)
  const slugToArticle = new Map(articles.map((a) => [articleSlug(a), a]))

  const tagToArticles = new Map<string, WikiArticle[]>()
  const entityToArticles = new Map<string, WikiArticle[]>()
  for (const a of articles) {
    if (!a.path.startsWith(paths.wiki) && !a.path.startsWith(paths.output)) continue
    for (const t of a.tags) {
      const nt = normalizeTag(t)
      const list = tagToArticles.get(nt) ?? []
      list.push(a)
      tagToArticles.set(nt, list)
    }
    if (a.entities) {
      for (const [category, names] of Object.entries(a.entities)) {
        for (const name of names) {
          const eKey = `${category}:${name}`
          const list = entityToArticles.get(eKey) ?? []
          list.push(a)
          entityToArticles.set(eKey, list)
        }
      }
    }
  }

  const nodes = new Map<string, WikiMapNode>()
  const edges: WikiMapEdge[] = []
  const edgeKeys = new Set<string>()

  function addEdge(fromKey: string, toKey: string, relation: WikiMapEdge['relation']) {
    const ek = `${fromKey}|${toKey}|${relation}`
    if (edgeKeys.has(ek)) return
    edgeKeys.add(ek)
    edges.push({ fromKey, toKey, relation })
  }

  function addNode(node: WikiMapNode): boolean {
    if (nodes.size >= maxNodes && !nodes.has(node.key)) return false
    if (!nodes.has(node.key)) {
      if (nodes.size >= maxNodes) return false
      nodes.set(node.key, node)
    }
    return true
  }

  function attachMeta(article: WikiArticle, _isFocal: boolean) {
    const aKey = `a:${article.path}`
    if (!nodes.has(aKey)) return

    for (const tag of article.tags) {
      const nt = normalizeTag(tag)
      const tKey = `t:${nt}`
      const tagNode: WikiMapNode = { key: tKey, label: `#${nt}`, kind: 'tag' }
      if (!addNode(tagNode)) continue
      addEdge(aKey, tKey, 'tag')
    }

    const otypes = ontologyFromFrontmatter(article.frontmatter)
    for (const o of otypes) {
      if (!ONTOLOGY_TYPES.includes(o as OntologyType)) continue
      const oKey = `o:${o}`
      const on: WikiMapNode = { key: oKey, label: o, kind: 'ontology' }
      if (!addNode(on)) continue
      addEdge(aKey, oKey, 'ontology')
    }

    const ents = article.entities
    if (ents) {
      for (const [category, names] of Object.entries(ents)) {
        for (const name of names) {
          const eKey = `e:${category}:${name}`
          const en: WikiMapNode = {
            key: eKey,
            label: `${category}/${name}`,
            kind: 'entity',
          }
          if (!addNode(en)) continue
          addEdge(aKey, eKey, 'entity')
        }
      }
    }
  }

  function ensureArticle(article: WikiArticle, _kind: WikiMapNodeKind, isFocal: boolean): boolean {
    if (!passesOntologyFilter(paths, article, ontologyFilter)) return false
    if (!passesTagFilter(article, tagFilter, isFocal)) return false
    const k = articleKind(paths, article)
    const displayKind: WikiMapNodeKind = isFocal ? 'focal' : k
    const node: WikiMapNode = {
      key: `a:${article.path}`,
      label: article.title,
      kind: displayKind,
      articlePath: article.path,
      webUrl: articleWebUrl(paths, article),
      slug: articleSlug(article),
    }
    if (!addNode(node)) return false
    attachMeta(article, isFocal)
    return true
  }

  const isConceptOrQuery = (a: WikiArticle) =>
    a.path.startsWith(paths.wikiConcepts) || a.path.startsWith(paths.output)

  /**
   * Expand one article in BFS: follow related_sources (concepts/queries),
   * reverse source→concept links, shared tags, and shared entities.
   * Returns new articles discovered for the next frontier.
   */
  function expandArticle(
    a: WikiArticle,
    seenPaths: Set<string>,
  ): WikiArticle[] {
    const next: WikiArticle[] = []
    const aKey = `a:${a.path}`

    if (isConceptOrQuery(a)) {
      for (const sSlug of parseRelatedSourceSlugs(a.frontmatter)) {
        const src = slugToArticle.get(sSlug) ?? findArticleBySlug(articles, sSlug)
        if (!src || !src.path.startsWith(paths.wikiSources)) continue
        if (!passesOntologyFilter(paths, src, ontologyFilter)) continue
        if (!passesTagFilter(src, tagFilter, false)) continue
        const existed = nodes.has(`a:${src.path}`)
        if (ensureArticle(src, 'source', false)) {
          addEdge(aKey, `a:${src.path}`, 'related_source')
          if (!existed && !seenPaths.has(src.path)) { seenPaths.add(src.path); next.push(src) }
        }
      }
    }

    if (a.path.startsWith(paths.wikiSources)) {
      const slug = articleSlug(a)
      for (const c of sourceToConcepts.get(slug) ?? []) {
        if (!passesOntologyFilter(paths, c, ontologyFilter)) continue
        if (!passesTagFilter(c, tagFilter, false)) continue
        const existed = nodes.has(`a:${c.path}`)
        if (ensureArticle(c, 'concept', false)) {
          addEdge(`a:${c.path}`, aKey, 'cited_by')
          if (!existed && !seenPaths.has(c.path)) { seenPaths.add(c.path); next.push(c) }
        }
      }
    }

    for (const tag of a.tags) {
      const nt = normalizeTag(tag)
      const peers = tagToArticles.get(nt) ?? []
      let bridged = 0
      for (const peer of peers) {
        if (bridged >= bridgeCap) break
        if (peer.path === a.path || seenPaths.has(peer.path)) continue
        if (!passesOntologyFilter(paths, peer, ontologyFilter)) continue
        if (!passesTagFilter(peer, tagFilter, false)) continue
        const existed = nodes.has(`a:${peer.path}`)
        if (ensureArticle(peer, articleKind(paths, peer), false)) {
          const tKey = `t:${nt}`
          addEdge(`a:${peer.path}`, tKey, 'tag')
          if (!existed) { seenPaths.add(peer.path); next.push(peer); bridged++ }
        }
      }
    }

    if (a.entities) {
      for (const [category, names] of Object.entries(a.entities)) {
        for (const name of names) {
          const ek = `${category}:${name}`
          const peers = entityToArticles.get(ek) ?? []
          let bridged = 0
          for (const peer of peers) {
            if (bridged >= bridgeCap) break
            if (peer.path === a.path || seenPaths.has(peer.path)) continue
            if (!passesOntologyFilter(paths, peer, ontologyFilter)) continue
            if (!passesTagFilter(peer, tagFilter, false)) continue
            const existed = nodes.has(`a:${peer.path}`)
            if (ensureArticle(peer, articleKind(paths, peer), false)) {
              const eNodeKey = `e:${ek}`
              addEdge(`a:${peer.path}`, eNodeKey, 'entity')
              if (!existed) { seenPaths.add(peer.path); next.push(peer); bridged++ }
            }
          }
        }
      }
    }

    return next
  }

  if (center.type === 'overview') {
    const rootKey = 'overview:root'
    const rootNode: WikiMapNode = { key: rootKey, label: center.kbName, kind: 'focal' }
    addNode(rootNode)

    const connectionCount = new Map<string, number>()
    for (const a of articles) {
      if (!a.path.startsWith(paths.wiki) && !a.path.startsWith(paths.output)) continue
      const slug = articleSlug(a)
      const refs = parseRelatedSourceSlugs(a.frontmatter)
      connectionCount.set(slug, (connectionCount.get(slug) ?? 0) + refs.length + a.tags.length)
      for (const ref of refs) {
        connectionCount.set(ref, (connectionCount.get(ref) ?? 0) + 1)
      }
    }

    const byConn = (a: WikiArticle, b: WikiArticle) => {
      const ca = connectionCount.get(articleSlug(a)) ?? 0
      const cb = connectionCount.get(articleSlug(b)) ?? 0
      return cb - ca
    }

    const wikiArticles = articles.filter(
      (a) =>
        (a.path.startsWith(paths.wiki) || a.path.startsWith(paths.output)) &&
        passesOntologyFilter(paths, a, ontologyFilter),
    ).sort(byConn)

    const hubCount = Math.min(Math.max(8, Math.floor(maxNodes / 5)), 40)
    const hubs = wikiArticles.slice(0, hubCount)

    for (const hub of hubs) {
      if (!ensureArticle(hub, articleKind(paths, hub), false)) continue
      addEdge(rootKey, `a:${hub.path}`, 'related_source')
    }

    const seenPaths = new Set(hubs.map((a) => a.path))
    let frontier = [...hubs]
    let hop = 0

    while (hop < depth && nodes.size < maxNodes) {
      const next: WikiArticle[] = []
      for (const a of frontier) {
        next.push(...expandArticle(a, seenPaths))
      }
      hop++
      frontier = next
      if (frontier.length === 0) break
    }

    return { nodes: [...nodes.values()], edges }
  }

  if (center.type === 'tag') {
    const nt = normalizeTag(center.tag)
    const tKey = `t:${nt}`
    const focalTag: WikiMapNode = { key: tKey, label: `#${nt}`, kind: 'focal' }
    if (!addNode(focalTag)) return { nodes: [...nodes.values()], edges }

    const tagged = articles.filter(
      (a) =>
        (a.path.startsWith(paths.wiki) || a.path.startsWith(paths.output)) &&
        a.tags.some((t) => normalizeTag(t) === nt) &&
        passesOntologyFilter(paths, a, ontologyFilter),
    )

    const seenPaths = new Set<string>()
    let frontier = [...tagged]
    let hop = 0

    while (hop < depth && nodes.size < maxNodes) {
      const next: WikiArticle[] = []
      for (const a of frontier) {
        if (seenPaths.has(a.path)) continue
        seenPaths.add(a.path)
        if (!ensureArticle(a, articleKind(paths, a), false)) continue
        addEdge(tKey, `a:${a.path}`, 'tag_center')

        if (hop + 1 < depth) {
          next.push(...expandArticle(a, seenPaths))
        }
      }
      hop++
      frontier = next
      if (frontier.length === 0) break
    }

    return { nodes: [...nodes.values()], edges }
  }

  if (center.type === 'entity') {
    const eKey = `e:${center.entityKey}`
    const label = center.entityKey.replace(':', '/')
    const focalEntity: WikiMapNode = { key: eKey, label, kind: 'focal' }
    if (!addNode(focalEntity)) return { nodes: [...nodes.values()], edges }

    const matching = entityToArticles.get(center.entityKey) ?? []

    const seenArticlePaths = new Set<string>()
    let frontier = [...matching]
    let hop = 0

    while (hop < depth && nodes.size < maxNodes) {
      const next: WikiArticle[] = []
      for (const a of frontier) {
        if (seenArticlePaths.has(a.path)) continue
        seenArticlePaths.add(a.path)
        if (!passesOntologyFilter(paths, a, ontologyFilter)) continue
        if (!ensureArticle(a, articleKind(paths, a), false)) continue
        addEdge(eKey, `a:${a.path}`, 'entity')

        if (hop + 1 < depth) {
          next.push(...expandArticle(a, seenArticlePaths))
        }
      }
      hop++
      frontier = next
      if (frontier.length === 0) break
    }

    return { nodes: [...nodes.values()], edges }
  }

  const focalArticle = findArticleBySlug(articles, center.slug)
  if (!focalArticle) {
    return { nodes: [], edges: [] }
  }

  if (!ensureArticle(focalArticle, articleKind(paths, focalArticle), true)) {
    return { nodes: [], edges: [] }
  }

  const seenPaths = new Set([focalArticle.path])
  let frontier: WikiArticle[] = [focalArticle]
  let hop = 0

  while (hop < depth && nodes.size < maxNodes) {
    const next: WikiArticle[] = []
    for (const a of frontier) {
      next.push(...expandArticle(a, seenPaths))
    }
    hop++
    frontier = next
    if (frontier.length === 0) break
  }

  return { nodes: [...nodes.values()], edges }
}

/** Serialize canonical graph for tooling / alternate renderers. */
export function wikiMapGraphToJson(graph: WikiMapGraph): string {
  return JSON.stringify(graph, null, 2)
}
