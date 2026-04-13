import { listWikiArticles, getAllTagsWithCounts } from './wiki.js'
import type { WikiArticle, TagWithCount } from './wiki.js'
import { requireKbRoot, kbPaths } from './paths.js'

export type SortOption = 'alpha-asc' | 'alpha-desc' | 'date-newest' | 'date-oldest'

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

export type SourceTypeWithCount = {
  type: string
  count: number
}

export function getAllSourceTypesWithCounts(articles: WikiArticle[]): SourceTypeWithCount[] {
  const counts = new Map<string, number>()
  for (const article of articles) {
    const sourceType = article.frontmatter.source_type ? String(article.frontmatter.source_type) : 'text'
    counts.set(sourceType, (counts.get(sourceType) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
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

  // Calculate tags from filtered sources only (not concepts/queries)
  // This ensures tag filter bar only shows tags that exist on sources
  const sourceTags = new Map<string, number>()
  for (const source of sources) {
    for (const tag of source.tags) {
      sourceTags.set(tag, (sourceTags.get(tag) ?? 0) + 1)
    }
  }
  const tagsWithCounts: TagWithCount[] = [...sourceTags.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(a.tag))

  return { sources, concepts, queries, tagsWithCounts }
}

function getArticleDate(article: WikiArticle): string | null {
  // Check various date fields in frontmatter
  const dateFields = [
    'date_compiled',
    'source_published_date',
    'date',
    'created',
    'published',
  ]
  for (const field of dateFields) {
    const value = article.frontmatter[field]
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (value && typeof value === 'string') {
      return value
    }
  }
  return null
}

function sortArticles(
  items: WikiArticle[],
  sort: SortOption,
): WikiArticle[] {
  const sorted = [...items]

  switch (sort) {
    case 'alpha-asc':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'alpha-desc':
      sorted.sort((a, b) => b.title.localeCompare(a.title))
      break
    case 'date-newest':
      sorted.sort((a, b) => {
        const dateA = getArticleDate(a)
        const dateB = getArticleDate(b)
        if (!dateA && !dateB) return a.title.localeCompare(b.title)
        if (!dateA) return 1
        if (!dateB) return -1
        const timeA = new Date(dateA).getTime()
        const timeB = new Date(dateB).getTime()
        if (timeA === timeB) return a.title.localeCompare(b.title)
        return timeB - timeA
      })
      break
    case 'date-oldest':
      sorted.sort((a, b) => {
        const dateA = getArticleDate(a)
        const dateB = getArticleDate(b)
        if (!dateA && !dateB) return a.title.localeCompare(b.title)
        if (!dateA) return 1
        if (!dateB) return -1
        const timeA = new Date(dateA).getTime()
        const timeB = new Date(dateB).getTime()
        if (timeA === timeB) return a.title.localeCompare(b.title)
        return timeA - timeB
      })
      break
  }

  return sorted
}

function paginateItems(
  items: WikiArticle[],
  page: number,
  perPage: number,
  sort: SortOption = 'alpha-asc',
): PaginatedSection {
  const sortedItems = sortArticles(items, sort)
  const total = sortedItems.length
  const pages = Math.ceil(total / perPage)
  const clampedPage = Math.max(1, Math.min(page, pages || 1))
  const offset = (clampedPage - 1) * perPage
  const paginatedItems = sortedItems.slice(offset, offset + perPage)

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
  activeSourceType?: string,
  sort: SortOption = 'alpha-asc',
): PaginatedWikiNavLists & { sourceTypesWithCounts: SourceTypeWithCount[] } {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  let articles = listWikiArticles()

  if (activeTag) {
    articles = articles.filter(a =>
      a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()),
    )
  }

  // Get source types from all sources (before filtering by source type)
  const allSources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const sourceTypesWithCounts = getAllSourceTypesWithCounts(allSources)

  // Filter sources by source type if specified
  if (activeSourceType) {
    articles = articles.filter(a => {
      if (!a.path.startsWith(paths.wikiSources)) return true
      const sourceType = a.frontmatter.source_type ? String(a.frontmatter.source_type) : 'text'
      return sourceType === activeSourceType
    })
  }

  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const queries = articles.filter(a => a.path.startsWith(paths.output))

  // Calculate tags from filtered sources only (not concepts/queries)
  // This ensures tag filter bar only shows tags that exist on currently visible sources
  const sourceTags = new Map<string, number>()
  for (const source of sources) {
    for (const tag of source.tags) {
      sourceTags.set(tag, (sourceTags.get(tag) ?? 0) + 1)
    }
  }
  const tagsWithCounts: TagWithCount[] = [...sourceTags.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const perPage = pageConfig.perPage ?? 12

  return {
    sources: paginateItems(sources, pageConfig.sourcesPage ?? 1, perPage, sort),
    concepts: paginateItems(concepts, pageConfig.conceptsPage ?? 1, perPage, sort),
    queries: paginateItems(queries, pageConfig.queriesPage ?? 1, perPage, sort),
    tagsWithCounts,
    sourceTypesWithCounts,
  }
}
