import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { readLlmLogs } from '../../lib/llm-stats.js'

export const apiRoutes = new Hono()

apiRoutes.get('/logs/stream', (c) => {
  return streamSSE(c, async (stream) => {
    let lastCount = readLlmLogs().length
    let aborted = false

    c.req.raw.signal?.addEventListener('abort', () => {
      aborted = true
    })

    await stream.writeSSE({ data: JSON.stringify({ type: 'connected' }) })

    while (!aborted) {
      try {
        const logs = readLlmLogs()
        if (logs.length > lastCount) {
          const newEntries = logs.slice(lastCount)
          for (const log of newEntries) {
            await stream.writeSSE({ data: JSON.stringify(log) })
          }
          lastCount = logs.length
        }
      } catch {
        break
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  })
})
