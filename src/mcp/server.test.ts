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

  it('registers 5 tools', () => {
    const server = createTheoraMcpServer()
    const toolNames = Object.keys(getTools(server))
    expect(toolNames).toContain('search')
    expect(toolNames).toContain('ask')
    expect(toolNames).toContain('wiki-stats')
    expect(toolNames).toContain('list-tags')
    expect(toolNames).toContain('list-entities')
    expect(toolNames).toHaveLength(5)
  })

  it('registers 4 resource types', () => {
    const server = createTheoraMcpServer()
    const staticUris = Object.keys(getResources(server))
    const templateNames = Object.keys(getResourceTemplates(server))
    expect(staticUris).toContain('theora://wiki/index')
    expect(templateNames).toContain('wiki-source')
    expect(templateNames).toContain('wiki-concept')
    expect(templateNames).toContain('wiki-query')
    expect(staticUris.length + templateNames.length).toBe(4)
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

  it('wiki-source template lists available sources', async () => {
    const server = createTheoraMcpServer()
    const templates = getResourceTemplates(server)
    const listed = await templates['wiki-source']!.resourceTemplate.listCallback()
    expect(listed.resources.length).toBe(1)
    expect(listed.resources[0]!.name).toBe('Redis Caching Guide')
    expect(listed.resources[0]!.uri).toContain('redis-guide')
  })

  it('wiki-source template reads a specific source', async () => {
    const server = createTheoraMcpServer()
    const templates = getResourceTemplates(server)
    const result = await templates['wiki-source']!.readCallback(
      new URL('theora://wiki/sources/redis-guide'),
      { slug: 'redis-guide' },
    )
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0]!.text).toContain('Redis Caching Guide')
    expect(result.contents[0]!.text).toContain('in-memory data store')
  })

  it('wiki-concept template lists concepts', async () => {
    const server = createTheoraMcpServer()
    const templates = getResourceTemplates(server)
    const listed = await templates['wiki-concept']!.resourceTemplate.listCallback()
    expect(listed.resources.length).toBe(1)
    expect(listed.resources[0]!.name).toBe('Caching')
  })

  it('wiki-query template lists output queries', async () => {
    const server = createTheoraMcpServer()
    const templates = getResourceTemplates(server)
    const listed = await templates['wiki-query']!.resourceTemplate.listCallback()
    expect(listed.resources.length).toBe(1)
    expect(listed.resources[0]!.name).toBe('What is Redis?')
  })

  it('wiki-source template throws for unknown slug', async () => {
    const server = createTheoraMcpServer()
    const templates = getResourceTemplates(server)
    await expect(
      templates['wiki-source']!.readCallback(
        new URL('theora://wiki/sources/nonexistent'),
        { slug: 'nonexistent' },
      ),
    ).rejects.toThrow('Source not found')
  })
})
