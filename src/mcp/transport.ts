import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { createTheoraMcpServer } from './server.js'

type McpSession = {
  server: ReturnType<typeof createTheoraMcpServer>
  transport: WebStandardStreamableHTTPServerTransport
}

const sessions = new Map<string, McpSession>()

const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes idle timeout
const SESSION_CLEANUP_INTERVAL_MS = 60_000 // check every 60s
const SSE_KEEP_ALIVE_MS = 15_000

/** Per-session idle expiry timer handle */
const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>()

function touchSession(sessionId: string): void {
  const existing = sessionTimers.get(sessionId)
  if (existing) clearTimeout(existing)
  sessionTimers.set(
    sessionId,
    setTimeout(() => closeSession(sessionId, 'idle timeout'), SESSION_TTL_MS),
  )
}

function closeSession(sessionId: string, reason: string): void {
  const session = sessions.get(sessionId)
  if (!session) return
  session.transport.onclose?.()
  mcpLog(`session=${sessionId.slice(0, 8)} closed (${reason})`)
  sessions.delete(sessionId)
  sessionTimers.delete(sessionId)
}

// Periodic sweep for orphaned sessions (e.g. POST-only without close)
const cleanupInterval = setInterval(() => {
  for (const id of sessions.keys()) {
    if (!sessionTimers.has(id)) {
      // No timer means the session was created without a touch — unlikely
      // but guard against orphan entries
      closeSession(id, 'cleanup sweep')
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS)

// Don't prevent process exit
cleanupInterval.unref()

/** CORS preset for MCP streamable-http endpoints. */
export const mcpCors = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
})

function mcpLog(msg: string): void {
  console.error(`[theora:mcp:http] ${msg}`)
}

/**
 * Wrap an SSE Response with retry directive + periodic keep-alive comments
 * so the client doesn't treat an idle stream as dead.
 */
function wrapSseWithKeepAlive(original: Response): {
  response: Response
  stopKeepAlive: () => void
} {
  const originalBody = original.body
  if (!originalBody) return { response: original, stopKeepAlive: () => {} }

  const encoder = new TextEncoder()
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const pump = async () => {
    const reader = originalBody.getReader()
    try {
      await writer.write(encoder.encode('retry: 30000\n\n'))

      keepAliveTimer = setInterval(async () => {
        try {
          await writer.write(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAliveTimer)
        }
      }, SSE_KEEP_ALIVE_MS)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        await writer.write(value)
      }
      await writer.close()
    } catch {
      try { await writer.close() } catch { /* already closed */ }
    } finally {
      clearInterval(keepAliveTimer)
    }
  }
  pump()

  return {
    response: new Response(readable, {
      status: original.status,
      headers: original.headers,
    }),
    stopKeepAlive: () => clearInterval(keepAliveTimer),
  }
}

function isSseResponse(res: Response): boolean {
  return res.headers.get('content-type')?.includes('text/event-stream') ?? false
}

/**
 * Route an incoming HTTP request to the correct MCP session.
 * Creates a new server + transport pair for unknown / missing session IDs,
 * reuses existing ones for subsequent requests within a session.
 */
export async function handleMcpRequest(raw: Request): Promise<Response> {
  const method = raw.method
  const sessionId = raw.headers.get('mcp-session-id')

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    touchSession(sessionId)
    const response = await session.transport.handleRequest(raw)

    if (method === 'GET' && isSseResponse(response)) {
      const { response: wrapped, stopKeepAlive } = wrapSseWithKeepAlive(response)
      const origOnclose = session.transport.onclose
      session.transport.onclose = () => {
        stopKeepAlive()
        origOnclose?.()
        sessions.delete(sessionId)
        sessionTimers.delete(sessionId)
      }
      mcpLog(`session=${sessionId.slice(0, 8)} SSE stream opened`)
      return wrapped
    }

    return response
  }

  const server = createTheoraMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  })
  await server.connect(transport)

  const response = await transport.handleRequest(raw)

  const newId = response.headers.get('mcp-session-id')
  if (newId) {
    mcpLog(`session=${newId.slice(0, 8)} created`)
    touchSession(newId)
    sessions.set(newId, { server, transport })
    transport.onclose = () => {
      closeSession(newId, 'transport close')
    }
  }

  if (method === 'GET' && isSseResponse(response)) {
    const { response: wrapped, stopKeepAlive } = wrapSseWithKeepAlive(response)
    if (newId) {
      const origOnclose = transport.onclose
      transport.onclose = () => {
        stopKeepAlive()
        origOnclose?.()
      }
    }
    mcpLog(`session=${newId?.slice(0, 8) ?? '?'} SSE stream opened`)
    return wrapped
  }

  return response
}

/**
 * Build a standalone Hono sub-app that serves the MCP protocol.
 * Used by both `theora serve` (mounted at /mcp) and `theora-mcp --http`.
 */
export function createMcpApp(): Hono {
  const app = new Hono()
  app.use('*', mcpCors)
  app.get('/health', (c) =>
    c.json({ status: 'ok', server: 'theora-mcp', sessions: sessions.size }),
  )
  app.all('/', (c) => handleMcpRequest(c.req.raw))
  return app
}
