import { Hono } from 'hono'
import type { AppVariables } from '../middleware/context.js'
import { readKbStatsJson } from '../../lib/kb-stats-json.js'
import { loadPaginatedWikiNavLists } from '../../lib/wiki-nav.js'
import { Layout } from '../pages/layout.js'
import { HomePage } from '../pages/home.js'

export const homeRoutes = new Hono<{ Variables: AppVariables }>()

homeRoutes.get('/', (c) => {
  const activeTag = c.req.query('tag') ?? ''
  const page = parseInt(c.req.query('page') ?? '1', 10) || 1
  const perPage = 12

  const { sources, concepts, queries, tagsWithCounts } =
    loadPaginatedWikiNavLists(activeTag, { sourcesPage: page, perPage })
  const stats = readKbStatsJson()
  const config = c.get('config')

  return c.html(
    Layout({
      title: c.get('kbName'),
      active: 'home',
      children: HomePage({
        sources: sources.items,
        concepts: concepts.items,
        queries: queries.items,
        tagsWithCounts,
        activeTag,
        stats,
        config: config as unknown as Record<string, unknown>,
        pagination: {
          currentPage: sources.page,
          totalPages: sources.pages,
          totalItems: sources.total,
          itemsPerPage: sources.perPage,
        },
        totalCounts: {
          sources: sources.total,
          concepts: concepts.total,
          queries: queries.total,
        },
      }),
    }).toString(),
  )
})
