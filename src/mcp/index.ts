import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { StdioServerTransport } from '@modelcontextprotocol/server'
import { createTheoraMcpServer } from './server.js'
import { createMcpApp } from './transport.js'
import { resolveMcpPort, readConfigAtRoot, DEFAULT_MCP_PORT } from '../lib/config.js'
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
  let configValue: number | undefined
  const root = findActiveKbRoot()
  if (root) {
    try {
      const cfg = readConfigAtRoot(root)
      configValue = cfg.mcpPort
    } catch { /* fall through */ }
  }
  return resolveMcpPort(portArg, configValue)
}

if (httpMode) {
  const port = resolvePort()
  if (isDebugEnabled()) {
    console.error('Theora MCP: debug mode enabled (THEORA_MCP_DEBUG=1)')
  }

  const app = new Hono()
  app.get('/health', (c) => c.json({ status: 'ok', server: 'theora-mcp' }))
  app.route('/mcp', createMcpApp())

  serve({ fetch: app.fetch, port }, () => {
    console.error(`Theora MCP server listening on http://localhost:${port}/mcp`)
    console.error(`Health check: http://localhost:${port}/health`)
  })
} else {
  const server = createTheoraMcpServer()
  if (isDebugEnabled()) {
    console.error('Theora MCP: debug mode enabled (THEORA_MCP_DEBUG=1)')
  }
  const transport = new StdioServerTransport()
  await server.connect(transport)

  server.server.onerror = (error) => {
    console.error(`[theora:mcp] SDK error: ${error instanceof Error ? error.message : String(error)}`)
  }

  process.on('SIGINT', async () => {
    await server.close()
    process.exit(0)
  })
}

process.on('uncaughtException', (err) => {
  console.error(`[theora:mcp] uncaughtException: ${err.message}`)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error(`[theora:mcp] unhandledRejection: ${reason instanceof Error ? reason.message : String(reason)}`)
})
