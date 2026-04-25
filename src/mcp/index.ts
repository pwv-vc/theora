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
  const transport = new WebStandardStreamableHTTPServerTransport()
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
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})
