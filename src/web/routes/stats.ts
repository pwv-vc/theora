import { Hono } from 'hono'
import type { AppVariables } from '../middleware/context.js'
import { readLlmLogs, summarizeStats } from '../../lib/llm-stats.js'
import { Layout } from '../pages/layout.js'
import { StatsLogsPage, StatsUsagePage } from '../pages/stats.js'

export const statsRoutes = new Hono<{ Variables: AppVariables }>()

statsRoutes.get('/', (c) => {
  const search = new URL(c.req.url).search
  return c.redirect(`/stats/usage${search}`, 301)
})

statsRoutes.get('/usage', (c) => {
  const logs = readLlmLogs()
  const days = parseInt(c.req.query('days') ?? '30', 10)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoff)
  const summary = summarizeStats(filteredLogs)
  const config = c.get('config')
  const kbName = c.get('kbName')

  return c.html(
    Layout({
      title: `Usage — ${kbName}`,
      active: 'stats-usage',
      children: StatsUsagePage({ summary, days, config }),
    }).toString(),
  )
})

statsRoutes.get('/logs', (c) => {
  const logs = readLlmLogs()
  const config = c.get('config')
  const kbName = c.get('kbName')
  const recentLogs = logs.slice(-10)

  return c.html(
    Layout({
      title: `Logs — ${kbName}`,
      active: 'stats-logs',
      children: StatsLogsPage({ recentLogs, config }),
    }).toString(),
  )
})
