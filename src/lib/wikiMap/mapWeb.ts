import type { KbPaths } from '../paths.js'
import type { WikiArticle } from '../wiki.js'
import type { OntologyType } from '../wiki.js'
import { normalizeTag } from '../utils.js'
import { buildWikiMapGraph } from './graph.js'
import type { WikiMapGraph } from './graph.js'

export interface WikiMapWebGraphInput {
  paths: KbPaths
  articles: WikiArticle[]
  aroundRaw: string
  tagRaw: string
  entityRaw: string
  ontologyFilter: OntologyType | undefined
  depth: number
  maxNodes: number
  bridgeCap?: number
}

export interface WikiMapWebGraphOutput {
  error: string
  graph: WikiMapGraph | null
}

export function computeWikiMapWebGraph(input: WikiMapWebGraphInput): WikiMapWebGraphOutput {
  const wantsRender = Boolean(input.aroundRaw || input.tagRaw || input.entityRaw)
  if (!wantsRender) {
    return { error: '', graph: null }
  }

  if (input.aroundRaw && !/^[a-z0-9][a-z0-9-]*$/.test(input.aroundRaw)) {
    return {
      error: 'Slug may only contain lowercase letters, digits, and hyphens.',
      graph: null,
    }
  }

  let center: import('./graph.js').WikiMapCenter
  if (input.entityRaw) {
    center = { type: 'entity' as const, entityKey: input.entityRaw }
  } else if (input.aroundRaw) {
    center = { type: 'article' as const, slug: input.aroundRaw }
  } else {
    center = { type: 'tag' as const, tag: normalizeTag(input.tagRaw) }
  }
  const tagFilter = input.aroundRaw && input.tagRaw ? normalizeTag(input.tagRaw) : undefined

  const graph = buildWikiMapGraph({
    paths: input.paths,
    articles: input.articles,
    center,
    depth: input.depth,
    maxNodes: input.maxNodes,
    bridgeCap: input.bridgeCap,
    tagFilter,
    ontologyFilter: input.ontologyFilter,
  })

  if (graph.nodes.length === 0) {
    let error: string
    if (input.aroundRaw) error = `No graph for slug "${input.aroundRaw}" (unknown or excluded by filters).`
    else if (input.entityRaw) error = `No articles found for entity "${input.entityRaw}".`
    else error = 'No articles found for this tag with the current filters.'
    return { error, graph: null }
  }

  return { error: '', graph }
}

export interface EntityPill {
  slug: string
  label: string
}

export function collectEntityPills(articles: WikiArticle[], limit = 64): EntityPill[] {
  const seen = new Set<string>()
  const out: EntityPill[] = []
  for (const a of articles) {
    if (!a.entities) continue
    for (const [cat, names] of Object.entries(a.entities)) {
      if (!Array.isArray(names)) continue
      for (const name of names) {
        const slug = String(name).trim().toLowerCase()
        if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) continue
        if (seen.has(slug)) continue
        seen.add(slug)
        out.push({ slug, label: `${cat.replace(/-/g, ' ')} · ${slug.replace(/-/g, ' ')}` })
        if (out.length >= limit) {
          out.sort((x, y) => x.label.localeCompare(y.label))
          return out
        }
      }
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label))
  return out
}
