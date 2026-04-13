import { createMiddleware } from 'hono/factory'
import { readConfig, getKbName, type KbConfig } from '../../lib/config.js'

/**
 * Context variables available on all routes.
 * These are injected once at request start by injectKbContext middleware.
 */
export type AppVariables = {
  config: KbConfig
  kbName: string
}

/**
 * Middleware that loads the KB config once per request and injects
 * both the config and the display name (kbName) into the context.
 * This avoids repeated readConfig() calls and getKbName() computations.
 */
export const injectKbContext = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const config = readConfig()
  c.set('config', config)
  c.set('kbName', getKbName(config))
  await next()
})

/** Type for route handlers that need access to app context variables */
export type AppHono = import('hono').Hono<{ Variables: AppVariables }>
