import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { serve } from '@hono/node-server'
import { normalizeHttpErrorStatus, toContentfulErrorStatus } from '../lib/markdown-web.js'
import { printServeListenBanner } from '../lib/serve-banner.js'
import { webSecurityHeaders } from './middleware/security.js'
import { injectKbContext } from './middleware/context.js'
import { errorPageHtml } from './pages/error.js'
import { settingsRoutes } from './routes/settings.js'
import { staticRoutes } from './routes/static.js'
import { homeRoutes } from './routes/home.js'
import { wikiRoutes, outputRoutes } from './routes/wiki.js'
import { searchRoutes } from './routes/search.js'
import { askRoutes } from './routes/ask.js'
import { ingestRoutes } from './routes/ingest.js'
import { compileRoutes } from './routes/compile.js'
import { statsRoutes } from './routes/stats.js'
import { apiRoutes } from './routes/api.js'
import { mcpRoutes } from './routes/mcp.js'

export type StartServerOptions = {
  port: number
  kbRoot?: string
  kbName?: string
  /** LAN URLs, QR, Safari tips — pass through from `theora serve --share` */
  share?: boolean
}

export function createWebApp(): Hono {
  const app = new Hono()

  app.use('*', webSecurityHeaders)
  app.use('*', injectKbContext)

  app.route('/', staticRoutes)
  app.route('/', homeRoutes)
  app.route('/wiki', wikiRoutes)
  app.route('/output', outputRoutes)
  app.route('/search', searchRoutes)
  app.route('/ask', askRoutes)
  app.route('/ingest', ingestRoutes)
  app.route('/compile', compileRoutes)
  app.route('/stats', statsRoutes)
  app.route('/api', apiRoutes)
  app.route('/mcp', mcpRoutes)
  app.route('/settings', settingsRoutes)

  app.notFound((c) => {
    return c.html(errorPageHtml(404, c.req.path), 404)
  })

  app.onError((err, c) => {
    console.error('[web]', err)
    if (err instanceof HTTPException) {
      const status = normalizeHttpErrorStatus(err.status)
      const path = status === 404 ? c.req.path : undefined
      return c.html(errorPageHtml(status, path), toContentfulErrorStatus(status))
    }
    return c.html(errorPageHtml(500), 500)
  })

  return app
}

export function startServer(options: StartServerOptions | number): void {
  const opts = typeof options === 'number' ? { port: options } : options
  const app = createWebApp()

  serve({ fetch: app.fetch, port: opts.port }, (info) => {
    void printServeListenBanner({
      port: info.port,
      kbRoot: opts.kbRoot,
      kbName: opts.kbName,
      share: opts.share,
    })
  })
}
