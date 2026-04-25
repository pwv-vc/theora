import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kbPaths } from '../lib/paths.js'
import { createMcpApp, handleMcpRequest } from './transport.js'

function createTestKb(root: string): void {
  const paths = kbPaths(root)
  for (const dir of [paths.config, paths.raw]) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(
    paths.configFile,
    JSON.stringify({ name: 'Test KB', created: '2026-04-25T00:00:00.000Z', provider: 'openai', model: 'gpt-4o', compileConcurrency: 3, conceptSummaryChars: 3000, conceptMin: 5, conceptMax: 10 }, null, 2) + '\n',
  )
}

describe('createMcpApp', () => {
  const ORIGINAL_CWD = process.cwd()
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-mcp-tr-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createTestKb(tempRoot)
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('health endpoint returns ok', async () => {
    const app = createMcpApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.server).toBe('theora-mcp')
  })

  it('handles initialize request', async () => {
    const app = createMcpApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          clientInfo: { name: 'test', version: '0.0.1' },
        },
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.has('mcp-session-id')).toBe(true)
  })

  it('health endpoint reports sessions count after request', async () => {
    const app = createMcpApp()
    // Create a session via initialize
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.0.1' } },
      }),
    })

    const healthRes = await app.request('/health')
    const body = await healthRes.json()
    expect(body.sessions).toBeGreaterThanOrEqual(1)
  })
})

describe('handleMcpRequest', () => {
  const ORIGINAL_CWD = process.cwd()
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-mcp-hr-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createTestKb(tempRoot)
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('creates session on initial POST and returns session-id header', async () => {
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.0.1' } },
      }),
    })
    const res = await handleMcpRequest(req)
    expect(res.status).toBe(200)
    const sessionId = res.headers.get('mcp-session-id')
    expect(sessionId).toBeTruthy()
    expect(typeof sessionId).toBe('string')
  })

  it('reuses existing session on subsequent request', async () => {
    // First request — create session
    const req1 = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.0.1' } },
      }),
    })
    const res1 = await handleMcpRequest(req1)
    const sessionId = res1.headers.get('mcp-session-id')!

    // Second request — reuse session
    const req2 = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/list',
        params: {},
      }),
    })
    const res2 = await handleMcpRequest(req2)
    expect(res2.status).toBe(200)
  })

  it('creates session for tools/call request after initialize', async () => {
    // Must initialize first
    const initReq = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.0.1' } },
      }),
    })
    const initRes = await handleMcpRequest(initReq)
    const sessionId = initRes.headers.get('mcp-session-id')!

    // Now call a tool
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'wiki-stats', arguments: {} },
      }),
    })
    const res = await handleMcpRequest(req)
    expect(res.status).toBe(200)
  })

  it('handles OPTIONS preflight with CORS headers', async () => {
    const req = new Request('http://localhost/mcp', { method: 'OPTIONS' })
    const app = createMcpApp()
    const res = await app.request('/', { method: 'OPTIONS' })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })
})
