import { describe, expect, it } from 'vitest'
import type { KbPaths } from '../paths.js'
import type { WikiArticle } from '../wiki.js'
import { computeWikiMapWebGraph, collectEntityPills } from './mapWeb.js'

const paths = {
  root: '/kb',
  wiki: '/kb/wiki',
  wikiConcepts: '/kb/wiki/concepts',
  wikiSources: '/kb/wiki/sources',
  output: '/kb/output',
} as unknown as KbPaths

describe('mapWeb', () => {
  it('computeWikiMapWebGraph returns null graph when no focal', () => {
    const articles: WikiArticle[] = []
    const r = computeWikiMapWebGraph({
      paths,
      articles,
      aroundRaw: '',
      tagRaw: '',
      entityRaw: '',
      ontologyFilter: undefined,
      depth: 2,
      maxNodes: 48,
    })
    expect(r.error).toBe('')
    expect(r.graph).toBeNull()
  })

  it('computeWikiMapWebGraph returns graph with webUrl for valid slug', () => {
    const articles: WikiArticle[] = [
      {
        path: '/kb/wiki/concepts/c1.md',
        relativePath: 'wiki/concepts/c1.md',
        title: 'C1',
        content: '',
        tags: [],
        frontmatter: {},
      },
    ]
    const r = computeWikiMapWebGraph({
      paths,
      articles,
      aroundRaw: 'c1',
      tagRaw: '',
      entityRaw: '',
      ontologyFilter: undefined,
      depth: 2,
      maxNodes: 48,
    })
    expect(r.error).toBe('')
    expect(r.graph).not.toBeNull()
    const focal = r.graph!.nodes.find((n) => n.kind === 'focal')
    expect(focal?.webUrl).toBe('/wiki/concepts/c1')
  })

  it('collectEntityPills returns sorted unique slugs', () => {
    const pills = collectEntityPills(
      [
        {
          path: '/x',
          relativePath: 'x',
          title: 'T',
          content: '',
          tags: [],
          frontmatter: {},
          entities: { person: ['alpha-beta', 'gamma'] },
        },
        {
          path: '/y',
          relativePath: 'y',
          title: 'U',
          content: '',
          tags: [],
          frontmatter: {},
          entities: { org: ['alpha-beta'] },
        },
      ],
      10,
    )
    expect(pills.map((p) => p.slug)).toEqual(['alpha-beta', 'gamma'])
  })
})
