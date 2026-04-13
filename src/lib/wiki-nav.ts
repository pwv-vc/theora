import { listWikiArticles, getAllTagsWithCounts } from './wiki.js'
import type { WikiArticle, TagWithCount } from './wiki.js'
import { requireKbRoot, kbPaths } from './paths.js'

export type WikiNavLists = {
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  tagsWithCounts: TagWithCount[]
}

export type PaginatedSection = {
  items: WikiArticle[]
  total: number
  page: number
  pages: number
  perPage: number
}

export type PaginatedWikiNavLists = {
  sources: PaginatedSection
  concepts: PaginatedSection
  queries: PaginatedSection
  tagsWithCounts: TagWithCount[]
}

export function loadWikiNavLists(activeTag: string): WikiNavLists {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  let articles = listWikiArticles()

  if (activeTag) {
    articles = articles.filter(a =>
      a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()),
    )
  }

  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const queries = articles.filter(a => a.path.startsWith(paths.output))
  const tagsWithCounts = getAllTagsWithCounts()

  return { sources, concepts, queries, tagsWithCounts }
}

function paginateItems(
  items: WikiArticle[],
  page: number,
  perPage: number,
): PaginatedSection {
  const total = items.length
  const pages = Math.ceil(total / perPage)
  const clampedPage = Math.max(1, Math.min(page, pages || 1))
  const offset = (clampedPage - 1) * perPage
  const paginatedItems = items.slice(offset, offset + perPage)

  return {
    items: paginatedItems,
    total,
    page: clampedPage,
    pages,
    perPage,
  }
}

export function loadPaginatedWikiNavLists(
  activeTag: string,
  pageConfig: {
    sourcesPage?: number
    conceptsPage?: number
    queriesPage?: number
    perPage?: number
  } = {},
): PaginatedWikiNavLists {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  let articles = listWikiArticles()

  if (activeTag) {
    articles = articles.filter(a =>
      a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()),
    )
  }

  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const queries = articles.filter(a => a.path.startsWith(paths.output))
  const tagsWithCounts = getAllTagsWithCounts()

  const perPage = pageConfig.perPage ?? 12

  return {
    sources: paginateItems(sources, pageConfig.sourcesPage ?? 1, perPage),
    concepts: paginateItems(concepts, pageConfig.conceptsPage ?? 1, perPage),
    queries: paginateItems(queries, pageConfig.queriesPage ?? 1, perPage),
    tagsWithCounts,
  }
}
