import { describe, it, expect } from 'vitest'
import matter from 'gray-matter'
import { buildWikiMapGraph } from './graph.js'
import { emitWikiMapArtifacts } from './emitWikiMap.js'
import type { KbPaths } from '../paths.js'
import type { WikiArticle } from '../wiki.js'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

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

describe('emitWikiMapArtifacts', () => {
  it('writes YAML front matter with title, type mind-map, date, and diagram body', () => {
    const articles = [
      art('/kb/wiki/concepts/x.md', 'Root concept', {
        frontmatter: { related_sources: ['[[y]]'] },
      }),
      art('/kb/wiki/sources/y.md', 'Linked source'),
    ]
    const graph = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'article', slug: 'x' },
      depth: 2,
      maxNodes: 40,
    })

    const dir = mkdtempSync(join(tmpdir(), 'theora-map-'))
    try {
      const { primaryOutputPath } = emitWikiMapArtifacts({
        outputDir: dir,
        baseName: 'test-map',
        graph,
        focusLabel: 'Root concept',
      })
      const raw = readFileSync(primaryOutputPath, 'utf-8')
      const { data, content } = matter(raw)
      expect(data.title).toBe('Root concept Mind Map')
      expect(data.type).toBe('mind-map')
      expect(typeof data.date).toBe('string')
      expect(String(data.date)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(content).toContain('# Root concept')
      expect(content).toContain('- Linked source')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('merges markmap.initialExpandLevel into the same front matter block', () => {
    const articles = [
      art('/kb/wiki/concepts/x.md', 'Root concept', {
        frontmatter: { related_sources: ['[[y]]'] },
      }),
      art('/kb/wiki/sources/y.md', 'Linked source'),
    ]
    const graph = buildWikiMapGraph({
      paths,
      articles,
      center: { type: 'article', slug: 'x' },
      depth: 2,
      maxNodes: 40,
    })

    const dir = mkdtempSync(join(tmpdir(), 'theora-map-'))
    try {
      emitWikiMapArtifacts({
        outputDir: dir,
        baseName: 'test-map-expand',
        graph,
        focusLabel: 'Root concept',
        expandLevel: 3,
      })
      const raw = readFileSync(join(dir, 'test-map-expand.md'), 'utf-8')
      const { data } = matter(raw)
      expect(data.markmap).toEqual({ initialExpandLevel: 3 })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
