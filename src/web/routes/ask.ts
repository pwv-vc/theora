import { Hono } from 'hono'
import type { AppVariables } from '../middleware/context.js'
import { streamSSE } from 'hono/streaming'
import { listWikiArticles, normalizeLinksForWeb, getAllTagsWithCounts, getAllEntitiesWithCounts } from '../../lib/wiki.js'
import { buildAskPlaceholderPhrases } from '../../lib/ask-placeholders.js'
import { streamAsk } from '../../lib/ask.js'
import { Layout } from '../pages/layout.js'
import { AskPage } from '../pages/ask.js'

export const askRoutes = new Hono<{ Variables: AppVariables }>()

askRoutes.get('/', (c) => {
  const tagsWithCounts = getAllTagsWithCounts()
  const entitiesWithCounts = getAllEntitiesWithCounts()
  const placeholderPhrases = buildAskPlaceholderPhrases()
  const config = c.get('config')

  return c.html(
    Layout({
      title: 'Ask',
      active: 'ask',
      children: AskPage({ tagsWithCounts, entitiesWithCounts, config, placeholderPhrases }),
    }).toString(),
  )
})

askRoutes.get('/stream', async (c) => {
  const question = c.req.query('q') ?? ''
  if (!question.trim()) {
    return c.json({ error: 'No question provided' }, 400)
  }

  return streamSSE(c, async (stream) => {
    try {
      const tag = c.req.query('tag') || undefined
      const entity = c.req.query('entity') || undefined
      const { rawAnswer } = await streamAsk(question, {
        tag,
        entity,
        file: true,
        onChunk: (text) => { stream.writeSSE({ data: text }).catch(() => {}) },
      })

      const allArticles = listWikiArticles()
      const normalized = normalizeLinksForWeb(rawAnswer, allArticles)
      await stream.writeSSE({ event: 'done', data: normalized })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await stream.writeSSE({ event: 'error', data: msg })
    }
  })
})
