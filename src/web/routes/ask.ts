import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { listWikiArticles, normalizeLinksForWeb, getAllTagsWithCounts } from '../../lib/wiki.js'
import { readConfig } from '../../lib/config.js'
import { buildAskPlaceholderPhrases } from '../../lib/askPlaceholders.js'
import { streamAsk } from '../../lib/ask.js'
import { Layout } from '../pages/layout.js'
import { AskPage } from '../pages/ask.js'

export const askRoutes = new Hono()

askRoutes.get('/', (c) => {
  const tagsWithCounts = getAllTagsWithCounts()
  const placeholderPhrases = buildAskPlaceholderPhrases()
  const config = readConfig()

  return c.html(
    Layout({
      title: 'Ask',
      active: 'ask',
      children: AskPage({ tagsWithCounts, config, placeholderPhrases }),
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
      const { rawAnswer } = await streamAsk(question, {
        tag,
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
