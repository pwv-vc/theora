import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { createTheoraMcpServer } from '../../mcp/server.js'

export const mcpRoutes = new Hono()

const mcpServer = createTheoraMcpServer()
const mcpTransport = new WebStandardStreamableHTTPServerTransport()

const connectPromise = mcpServer.connect(mcpTransport)

mcpRoutes.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  }),
)

mcpRoutes.all('/', async (c) => {
  await connectPromise
  return mcpTransport.handleRequest(c.req.raw)
})
