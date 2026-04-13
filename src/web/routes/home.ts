import { Hono } from 'hono'
import { readConfig } from '../../lib/config.js'
import { readKbStatsJson } from '../../lib/kb-stats-json.js'
import { loadWikiNavLists } from '../../lib/wiki-nav.js'
import { Layout } from '../pages/layout.js'
import { HomePage } from '../pages/home.js'

export const homeRoutes = new Hono()

homeRoutes.get('/', (c) => {
  const activeTag = c.req.query('tag') ?? ''
  const { sources, concepts, queries, tagsWithCounts } = loadWikiNavLists(activeTag)
  const stats = readKbStatsJson()
  const config = readConfig()

  return c.html(
    Layout({
      title: config.name ?? 'Knowledge Base',
      active: 'home',
      children: HomePage({ sources, concepts, queries, tagsWithCounts, activeTag, stats, config: config as unknown as Record<string, unknown> }),
    }).toString(),
  )
})
