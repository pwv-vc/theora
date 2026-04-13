import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { requireKbRoot } from '../../lib/paths.js'
import { readConfig } from '../../lib/config.js'
import { runCompile } from '../../lib/compile.js'
import { Layout } from '../pages/layout.js'
import { CompilePage } from '../pages/compile.js'

export const compileRoutes = new Hono()

compileRoutes.get('/', (c) => {
  const ingestedCount = parseInt(c.req.query('ingested') ?? '0', 10)
  const ingestedFiles = c.req.query('files') ?? ''
  const config = readConfig()

  return c.html(
    Layout({
      title: 'Compile',
      active: 'compile',
      children: CompilePage({ ingestedCount, ingestedFiles, config }),
    }).toString(),
  )
})

compileRoutes.post('/run', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const force = body.force === true
  const sourcesOnly = body.sourcesOnly === true
  const conceptsOnly = body.conceptsOnly === true

  return streamSSE(c, async (stream) => {
    try {
      const root = requireKbRoot()

      await runCompile(
        root,
        { force, sourcesOnly, conceptsOnly },
        async (msg) => { await stream.writeSSE({ data: msg }) },
      )

      await stream.writeSSE({ event: 'done', data: 'Compilation complete' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await stream.writeSSE({ event: 'error', data: msg })
    }
  })
})
