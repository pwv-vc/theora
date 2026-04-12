import { describe, it, expect } from 'vitest'
import { buildWikiMapGraph, articleSlug } from './graph.js'
import { markmapMindMapVisualizer, graphToMarkmapMarkdown } from './visualizers/markmapMindMapVisualizer.js'
import type { KbPaths } from '../paths.js'
import type { WikiArticle } from '../wiki.js'

const paths = {
  root: '/kb',
  wiki: '/kb/wiki',
  wikiConcepts: '/kb/wiki/concepts',
  wikiSources: '/kb/wiki/sources',
  output: '/kb/output',
} as unknown as KbPaths

function art(p: string, title: string, extra: Partial<WikiArticle> = {}): WikiArticle {
  return {
    path: p,
    relativePath: p.replace('/kb/', ''),
    title,
    content: '',
    tags: extra.tags ?? [],
    frontmatter: extra.frontmatter ?? {},
    entities: extra.entities,
  }
}

describe('buildWikiMapGraph', () => {
  it('links concept to related sources and reverse', () => {
    const articles = [
      art('/kb/wiki/concepts/c1.md', 'Concept One', {
        frontmatter: { related_sources: ['[[s1]]'] },
        tags: ['alpha'],
      }),
      art('/kb/wiki/sources/s1.md', 'Source One', { tags: ['alpha'] }),
    ]
    const g = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'article', slug: 'c1' },
      depth: 2,
      maxNodes: 80,
    })
    expect(g.nodes.some((n) => n.label === 'Concept One')).toBe(true)
    expect(g.nodes.some((n) => n.label === 'Source One')).toBe(true)
    expect(g.edges.some((e) => e.relation === 'related_source')).toBe(true)
  })

  it('populates webUrl and slug on article nodes', () => {
    const articles = [
      art('/kb/wiki/concepts/c1.md', 'Concept One', {
        frontmatter: { related_sources: ['[[s1]]'] },
      }),
      art('/kb/wiki/sources/s1.md', 'Source One'),
    ]
    const g = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'article', slug: 'c1' },
      depth: 2,
      maxNodes: 80,
    })
    const focal = g.nodes.find((n) => n.kind === 'focal')
    expect(focal?.webUrl).toBe('/wiki/concepts/c1')
    expect(focal?.slug).toBe('c1')
    const src = g.nodes.find((n) => n.kind === 'source')
    expect(src?.webUrl).toBe('/wiki/sources/s1')
    expect(src?.slug).toBe('s1')
  })

  it('centers on tag and connects tagged articles', () => {
    const articles = [
      art('/kb/wiki/concepts/a.md', 'A', { tags: ['t1'] }),
      art('/kb/wiki/sources/b.md', 'B', { tags: ['t1'] }),
    ]
    const g = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'tag', tag: 't1' },
      depth: 2,
      maxNodes: 80,
    })
    expect(g.nodes.some((n) => n.kind === 'focal' && n.label === '#t1')).toBe(true)
    expect(g.edges.some((e) => e.relation === 'tag_center')).toBe(true)
  })

  it('returns empty for unknown slug', () => {
    const g = buildWikiMapGraph({
      paths,
      articles: [],
      center: { type: 'article', slug: 'nope' },
      depth: 1,
      maxNodes: 20,
    })
    expect(g.nodes).toHaveLength(0)
  })

  it('builds overview graph with KB name as root and real article connections', () => {
    const articles = [
      art('/kb/wiki/concepts/a.md', 'Alpha', {
        tags: ['t1'],
        frontmatter: { related_sources: ['[[b]]'] },
      }),
      art('/kb/wiki/sources/b.md', 'Beta', { tags: ['t1'] }),
      art('/kb/wiki/concepts/c.md', 'Gamma'),
    ]
    const g = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'overview', kbName: 'My KB' },
      depth: 2,
      maxNodes: 80,
    })
    const root = g.nodes.find((n) => n.kind === 'focal')
    expect(root?.label).toBe('My KB')
    expect(g.nodes.some((n) => n.label === 'Alpha')).toBe(true)
    expect(g.nodes.some((n) => n.label === 'Beta')).toBe(true)
    expect(g.edges.some((e) => e.relation === 'related_source')).toBe(true)
  })
})

describe('markmapMindMapVisualizer', () => {
  it('emits markdown with heading and list', () => {
    const articles = [
      art('/kb/wiki/concepts/x.md', 'Root concept', {
        frontmatter: { related_sources: ['[[y]]'] },
      }),
      art('/kb/wiki/sources/y.md', 'Linked source'),
    ]
    const g = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'article', slug: 'x' },
      depth: 2,
      maxNodes: 40,
    })
    const md = graphToMarkmapMarkdown(g)
    expect(md).toContain('# Root concept')
    expect(md).toContain('- Linked source')
    const payload = markmapMindMapVisualizer.toDiagram(g)
    expect(payload.diagramKind).toBe('markdown')
    expect(payload.sourceExtension).toBe('md')
  })
})

describe('articleSlug', () => {
  it('uses basename', () => {
    expect(articleSlug(art('/kb/wiki/concepts/foo-bar.md', 'Foo'))).toBe('foo-bar')
  })
})
