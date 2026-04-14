import { Hono } from 'hono'
import type { AppVariables } from '../middleware/context.js'
import { getAllTagsWithCounts } from '../../lib/wiki.js'
import { searchArticles } from '../../lib/search.js'
import { escapeHtml } from '../../lib/utils.js'
import { Layout } from '../pages/layout.js'
import { SearchPage, SearchResults } from '../pages/search.js'

export const searchRoutes = new Hono<{ Variables: AppVariables }>()

searchRoutes.get('/', (c) => {
  const q = c.req.query('q') ?? ''
  const tag = c.req.query('tag') ?? ''
  const entity = c.req.query('entity') ?? ''
  const tagsWithCounts = getAllTagsWithCounts()
  const config = c.get('config')

  return c.html(
    Layout({
      title: 'Search',
      active: 'search',
      children: SearchPage({ q, tag, entity, tagsWithCounts, config }),
    }).toString(),
  )
})

searchRoutes.get('/results', (c) => {
  const q = c.req.query('q') ?? ''
  const tag = c.req.query('tag') ?? ''
  const entity = c.req.query('entity') ?? ''

  if (!q.trim() && !tag && !entity) {
    return c.html('<div></div>')
  }

  try {
    const { results, suggestedQuery } = searchArticles(q, tag || undefined, entity || undefined)
    return c.html(
      SearchResults({
        results: results.slice(0, 20),
        q,
        tag,
        entity,
        suggestedQuery,
      }).toString(),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Search failed.'
    return c.html(`<div class="text-amber-600 text-sm py-4">${escapeHtml(msg)}</div>`)
  }
})
