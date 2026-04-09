import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WikiArticle } from './wiki.js'

const articles: WikiArticle[] = [
  {
    path: '/kb/wiki/sources/max-headroom-broadcast.md',
    relativePath: 'wiki/sources/max-headroom-broadcast.md',
    title: 'Max Headroom Broadcast Notes',
    content: 'Broadcast control room notes with production details and signal routing.',
    tags: ['broadcast', 'production'],
    frontmatter: {},
  },
  {
    path: '/kb/wiki/concepts/signal-routing.md',
    relativePath: 'wiki/concepts/signal-routing.md',
    title: 'Signal Routing',
    content: 'Signal routing is a core broadcast concept used in the control room.',
    tags: ['signal', 'broadcast'],
    frontmatter: {},
  },
  {
    path: '/kb/output/theora-query.md',
    relativePath: 'output/theora-query.md',
    title: 'Open questions',
    content: 'This query mentions broadcast once in the body only.',
    tags: ['analysis'],
    frontmatter: {},
  },
]

vi.mock('./wiki.js', () => ({
  listWikiArticles: vi.fn(() => articles),
}))

describe('searchArticles', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('ranks title and exact tag matches ahead of body-only matches', async () => {
    const { searchArticles } = await import('./search.js')

    const results = searchArticles('broadcast')

    expect(results).toHaveLength(3)
    expect(results[0]?.title).toBe('Max Headroom Broadcast Notes')
    expect(results[1]?.title).toBe('Signal Routing')
    expect(results[2]?.title).toBe('Open questions')
    expect(results[0]?.matchReasons).toContain('title match')
    expect(results[1]?.matchReasons).toContain('1 matching tag')
    expect(results[2]?.matchReasons).toEqual(['body match'])
  })

  it('applies selected tags as an intersection filter', async () => {
    const { searchArticles } = await import('./search.js')

    const results = searchArticles('', ['broadcast', 'signal'])

    expect(results).toHaveLength(1)
    expect(results[0]?.title).toBe('Signal Routing')
    expect(results[0]?.matchReasons).toContain('2 active tags')
  })

  it('uses alphabetical ordering as a stable tiebreaker for equal scores', async () => {
    const { searchArticles } = await import('./search.js')

    const results = searchArticles('', ['analysis'])

    expect(results).toHaveLength(1)
    expect(results[0]?.title).toBe('Open questions')
    expect(results[0]?.typeLabel).toBe('query')
  })
})
