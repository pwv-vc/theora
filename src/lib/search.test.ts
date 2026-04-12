import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import matter from 'gray-matter'
import { readFileSync } from 'node:fs'
import { kbPaths } from './paths.js'
import { buildSearchIndex } from './searchIndex.js'
import { searchArticles } from './search.js'

const ORIGINAL_CWD = process.cwd()

function createKb(root: string): void {
  const paths = kbPaths(root)
  for (const dir of [paths.config, paths.raw, paths.wiki, paths.wikiSources, paths.wikiConcepts, paths.output]) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(
    paths.configFile,
    JSON.stringify(
      {
        name: 'test-kb',
        created: '2026-04-11T00:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4o',
        compileConcurrency: 3,
        conceptSummaryChars: 3000,
        conceptMin: 5,
        conceptMax: 10,
      },
      null,
      2,
    ) + '\n',
  )
}

describe('searchArticles with BM25 index', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `theora-search-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createKb(tempRoot)
    process.chdir(tempRoot)

    const body = `## Redis

Redis is an in-memory data store. The price $5 tier is for testing regex-safe snippets.

### Other

PostgreSQL is a relational database.
`
    const doc = matter.stringify(body, {
      title: 'Redis caching guide',
      tags: ['database', 'cache'],
      date: '2026-01-15',
    })
    writeFileSync(join(tempRoot, 'wiki', 'sources', 'redis-guide.md'), doc, 'utf-8')

    buildSearchIndex(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('returns matching article for a content query', () => {
    const { results, suggestedQuery } = searchArticles('redis store')
    expect(suggestedQuery).toBeUndefined()
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]!.title).toContain('Redis')
    expect(results[0]!.snippet.length).toBeGreaterThan(0)
  })

  it('suggests correction for a near-miss token', () => {
    const { results, suggestedQuery } = searchArticles('reidis')
    expect(results.length).toBe(0)
    expect(suggestedQuery).toBeDefined()
    expect(suggestedQuery!.toLowerCase()).toContain('redis')
  })

  it('does not throw on query tokens with regex metacharacters', () => {
    const { results } = searchArticles('$5')
    expect(results.length).toBeGreaterThanOrEqual(0)
  })
})

describe('buildSearchIndex', () => {
  let tempRoot: string

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('does not confuse the stem "constructor" with Object.prototype', () => {
    tempRoot = join(tmpdir(), `theora-searchix-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    createKb(tempRoot)
    process.chdir(tempRoot)

    const doc = matter.stringify('Body mentions constructor keyword.', {
      title: 'constructor',
      tags: [],
      date: '2026-01-01',
    })
    writeFileSync(join(tempRoot, 'wiki', 'sources', 'ctor.md'), doc, 'utf-8')

    expect(() => buildSearchIndex(tempRoot)).not.toThrow()

    const raw = JSON.parse(readFileSync(kbPaths(tempRoot).searchIndex, 'utf-8')) as {
      postings: Record<string, unknown>
    }
    expect(Array.isArray(raw.postings.constructor)).toBe(true)
  })
})
