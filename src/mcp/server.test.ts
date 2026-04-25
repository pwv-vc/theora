import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import matter from 'gray-matter'
import { kbPaths } from '../lib/paths.js'
import { buildSearchIndex } from '../lib/search-index.js'
import { createTheoraMcpServer } from './server.js'

const ORIGINAL_CWD = process.cwd()

function createTestKb(root: string): void {
  const paths = kbPaths(root)
  for (const dir of [paths.config, paths.raw, paths.wiki, paths.wikiSources, paths.wikiConcepts, paths.output]) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(
    paths.configFile,
    JSON.stringify({
      name: 'Test KB',
      created: '2026-04-25T00:00:00.000Z',
      provider: 'openai',
      model: 'gpt-4o',
      compileConcurrency: 3,
      conceptSummaryChars: 3000,
      conceptMin: 5,
      conceptMax: 10,
    }, null, 2) + '\n',
  )
}

function writeSource(root: string, slug: string, title: string, body: string, tags: string[] = []): void {
  const doc = matter.stringify(body, { title, tags, type: 'source', date_compiled: '2026-04-25' })
  writeFileSync(join(kbPaths(root).wikiSources, `${slug}.md`), doc, 'utf-8')
}

function writeConcept(root: string, slug: string, title: string, body: string, tags: string[] = []): void {
  const doc = matter.stringify(body, { title, tags, type: 'concept', date_compiled: '2026-04-25' })
  writeFileSync(join(kbPaths(root).wikiConcepts, `${slug}.md`), doc, 'utf-8')
}

function writeOutput(root: string, slug: string, title: string, body: string): void {
  const doc = matter.stringify(body, { title, type: 'query', date: '2026-04-25T00:00:00.000Z' })
  writeFileSync(join(kbPaths(root).output, `${slug}.md`), doc, 'utf-8')
}

// Access private fields — McpServer v2 alpha doesn't expose public getters yet
type ToolEntry = { handler: (args: unknown, ctx: unknown) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }> }
type ResourceEntry = { readCallback: (uri: URL, params: Record<string, string>) => Promise<{ contents: { uri?: string; text: string }[] }> }
type TemplateEntry = {
  resourceTemplate: { listCallback: () => Promise<{ resources: { uri: string; name: string }[] }> }
  readCallback: (uri: URL, params: Record<string, string>) => Promise<{ contents: { uri?: string; text: string }[] }>
}

function getTools(server: ReturnType<typeof createTheoraMcpServer>) {
  return (server as unknown as { _registeredTools: Record<string, ToolEntry> })._registeredTools
}

function getResourceTemplates(server: ReturnType<typeof createTheoraMcpServer>) {
  return (server as unknown as { _registeredResourceTemplates: Record<string, TemplateEntry> })._registeredResourceTemplates
}

function getResources(server: ReturnType<typeof createTheoraMcpServer>) {
  return (server as unknown as { _registeredResources: Record<string, ResourceEntry> })._registeredResources
}

describe('createTheoraMcpServer', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createTestKb(tempRoot)
    writeSource(tempRoot, 'redis-guide', 'Redis Caching Guide', 'Redis is an in-memory data store used for caching.', ['database', 'cache'])
    writeSource(tempRoot, 'postgres-intro', 'PostgreSQL Introduction', 'PostgreSQL is a powerful relational database.', ['database'])
    writeConcept(tempRoot, 'caching', 'Caching', 'Caching is the practice of storing frequently accessed data.', ['performance'])
    writeOutput(tempRoot, 'what-is-redis', 'What is Redis?', 'Redis is an in-memory key-value store.')
    process.chdir(tempRoot)
    buildSearchIndex(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('creates a server instance', () => {
    const server = createTheoraMcpServer()
    expect(server).toBeDefined()
    expect(server.server).toBeDefined()
  })

  it('registers 6 tools', () => {
    const server = createTheoraMcpServer()
    const toolNames = Object.keys(getTools(server))
    expect(toolNames).toContain('search')
    expect(toolNames).toContain('ask')
    expect(toolNames).toContain('read-article')
    expect(toolNames).toContain('wiki-stats')
    expect(toolNames).toContain('list-tags')
    expect(toolNames).toContain('list-entities')
    expect(toolNames).toHaveLength(6)
  })

  it('registers 1 resource (wiki-index)', () => {
    const server = createTheoraMcpServer()
    const staticUris = Object.keys(getResources(server))
    expect(staticUris).toContain('theora://wiki/index')
    expect(staticUris).toHaveLength(1)
    // Resource templates are intentionally not registered — individual
    // articles are accessed via the `read-article` tool instead to avoid
    // Cursor enumerating + subscribing to every article on connect.
  })
})

describe('MCP tool handlers', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-mcp-tools-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createTestKb(tempRoot)
    writeSource(tempRoot, 'redis-guide', 'Redis Caching Guide', 'Redis is an in-memory data store used for caching.', ['database', 'cache'])
    writeSource(tempRoot, 'postgres-intro', 'PostgreSQL Introduction', 'PostgreSQL is a powerful relational database.', ['database'])
    writeConcept(tempRoot, 'caching', 'Caching', 'Caching is the practice of storing frequently accessed data.', ['performance'])
    writeOutput(tempRoot, 'what-is-redis', 'What is Redis?', 'Redis is an in-memory key-value store.')
    process.chdir(tempRoot)
    buildSearchIndex(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('search returns results for matching query', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['search']!.handler({ query: 'redis' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('result(s)')
    expect(text).toContain('Redis')
  })

  it('search returns no-results for unmatched query', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['search']!.handler({ query: 'xyznonexistent' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('No results')
  })

  it('search respects limit parameter', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['search']!.handler({ query: 'database', limit: 1 }, {})
    const text = result.content[0]!.text
    expect(text).toContain('1 result(s)')
  })

  it('search filters by tag', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['search']!.handler({ query: 'database', tag: 'cache' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('Redis')
    expect(text).not.toContain('PostgreSQL')
  })

  it('wiki-stats returns KB info', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['wiki-stats']!.handler({}, {})
    const text = result.content[0]!.text
    expect(text).toContain('Test KB')
    expect(text).toContain('Articles:')
    expect(text).toContain('2 sources')
    expect(text).toContain('1 concepts')
  })

  it('list-tags returns all tags with counts', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['list-tags']!.handler({}, {})
    const text = result.content[0]!.text
    expect(text).toContain('#database')
    expect(text).toContain('#cache')
    expect(text).toContain('#performance')
  })

  it('list-entities returns empty message when no entities', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['list-entities']!.handler({}, {})
    const text = result.content[0]!.text
    expect(text).toContain('No entities found')
  })

  it('read-article returns source content by path', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'wiki/sources/redis-guide' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('Redis Caching Guide')
    expect(text).toContain('in-memory data store')
  })

  it('read-article returns concept content by path', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'wiki/concepts/caching' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('Caching')
    expect(text).toContain('frequently accessed data')
  })

  it('read-article returns output content by path', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'output/what-is-redis' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('What is Redis?')
    expect(text).toContain('key-value store')
  })

  it('read-article strips .md extension from path', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'wiki/sources/redis-guide.md' }, {})
    const text = result.content[0]!.text
    expect(text).toContain('Redis Caching Guide')
  })

  it('read-article returns error for invalid path prefix', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'invalid/path' }, {})
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('Invalid path')
  })

  it('read-article returns error for non-existent article', async () => {
    const server = createTheoraMcpServer()
    const tools = getTools(server)
    const result = await tools['read-article']!.handler({ path: 'wiki/sources/nonexistent' }, {})
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('Article not found')
  })
})

describe('MCP resource handlers', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-mcp-res-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createTestKb(tempRoot)
    writeSource(tempRoot, 'redis-guide', 'Redis Caching Guide', 'Redis is an in-memory data store.', ['database'])
    writeConcept(tempRoot, 'caching', 'Caching', 'Caching stores data for fast access.', ['performance'])
    writeOutput(tempRoot, 'what-is-redis', 'What is Redis?', 'Redis is a key-value store.')
    writeFileSync(join(kbPaths(tempRoot).wikiIndex), '# Wiki Index\n\n- Redis Caching Guide\n- Caching\n')
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('wiki-index resource returns index content', async () => {
    const server = createTheoraMcpServer()
    const resources = getResources(server)
    const result = await resources['theora://wiki/index']!.readCallback(new URL('theora://wiki/index'), {})
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0]!.text).toContain('Wiki Index')
    expect(result.contents[0]!.text).toContain('Redis')
  })

  // Resource template tests removed — the server intentionally uses the
  // `read-article` tool instead of resource templates to avoid Cursor
  // subscribing to every article on connect (~600 POSTs).
})
