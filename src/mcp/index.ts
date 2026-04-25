import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  StdioServerTransport,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import { createTheoraMcpServer } from './server.js'
import { readConfigAtRoot, DEFAULT_MCP_PORT, MCP_PORT_ENV } from '../lib/config.js'
import { findActiveKbRoot } from '../lib/paths.js'

const args = process.argv.slice(2)
if (args.includes('--debug')) {
  process.env.THEORA_MCP_DEBUG = '1'
}

function isDebugEnabled(): boolean {
  if (args.includes('--debug')) return true
  const raw = process.env.THEORA_MCP_DEBUG?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

const httpMode = args.includes('--http')
const portArgIdx = args.indexOf('--port')
const portArg = portArgIdx !== -1 ? args[portArgIdx + 1] : undefined

function resolvePort(): number {
  if (portArg) {
    const p = parseInt(portArg, 10)
    if (!Number.isNaN(p) && p > 0 && p <= 65535) return p
  }
  if (process.env[MCP_PORT_ENV]) {
    const p = parseInt(process.env[MCP_PORT_ENV]!, 10)
    if (!Number.isNaN(p) && p > 0 && p <= 65535) return p
  }
  const root = findActiveKbRoot()
  if (root) {
    try {
      const config = readConfigAtRoot(root)
      if (config.mcpPort) return config.mcpPort
    } catch { /* fall through to default */ }
  }
  return DEFAULT_MCP_PORT
}

const server = createTheoraMcpServer()

if (httpMode) {
  const port = resolvePort()
  if (isDebugEnabled()) {
    console.error('Theora MCP: debug mode enabled (THEORA_MCP_DEBUG=1)')
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  })
  await server.connect(transport)

  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
      exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
    }),
  )

  app.get('/health', (c) => c.json({ status: 'ok', server: 'theora-mcp' }))
  app.all('/mcp', (c) => transport.handleRequest(c.req.raw))

  serve({ fetch: app.fetch, port }, () => {
    console.error(`Theora MCP server listening on http://localhost:${port}/mcp`)
    console.error(`Health check: http://localhost:${port}/health`)
  })
} else {
  const debugEnabled = isDebugEnabled()
  if (debugEnabled) {
    console.error('Theora MCP: debug mode enabled (THEORA_MCP_DEBUG=1)')
  }
  const transport = new StdioServerTransport()

  if (debugEnabled) {
    const originalSend = transport.send.bind(transport)
    transport.send = async (message: unknown, options?: unknown) => {
      const json = JSON.stringify(message)
      const isResponse = typeof message === 'object' && message !== null && 'result' in message
      const isError = typeof message === 'object' && message !== null && 'error' in message
      const ts = new Date().toISOString()
      if (isResponse || isError) {
        console.error(`[theora:mcp][${ts}] transport.send RESPONSE (${json.length} bytes): ${json.slice(0, 300)}…`)
      } else {
        console.error(`[theora:mcp][${ts}] transport.send notification: ${json.slice(0, 200)}`)
      }
      try {
        await originalSend(message, options)
        if (isResponse || isError) {
          console.error(`[theora:mcp][${ts}] transport.send RESPONSE delivered OK`)
        }
      } catch (err) {
        console.error(`[theora:mcp][${ts}] transport.send FAILED: ${err instanceof Error ? err.message : String(err)}`)
        throw err
      }
    }
  }

  await server.connect(transport)

  // Catch SDK-internal errors that silently swallow responses
  server.server.onerror = (error) => {
    console.error(`[theora:mcp] SDK error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  console.error(`[theora:mcp] uncaughtException: ${err.message}`)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error(`[theora:mcp] unhandledRejection: ${reason instanceof Error ? reason.message : String(reason)}`)
})
