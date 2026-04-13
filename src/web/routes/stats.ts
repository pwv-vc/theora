import { Hono } from 'hono'
import { readLlmLogs, summarizeStats } from '../../lib/llm-stats.js'
import { readConfig } from '../../lib/config.js'
import { Layout } from '../pages/layout.js'
import { StatsLogsPage, StatsUsagePage } from '../pages/stats.js'

export const statsRoutes = new Hono()

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
  const config = readConfig()

  return c.html(
    Layout({
      title: `Usage — ${config.name ?? 'Knowledge Base'}`,
      active: 'stats-usage',
      children: StatsUsagePage({ summary, days, config }),
    }).toString(),
  )
})

statsRoutes.get('/logs', (c) => {
  const logs = readLlmLogs()
  const config = readConfig()
  const recentLogs = logs.slice(-10)

  return c.html(
    Layout({
      title: `Logs — ${config.name ?? 'Knowledge Base'}`,
      active: 'stats-logs',
      children: StatsLogsPage({ recentLogs, config }),
    }).toString(),
  )
})
