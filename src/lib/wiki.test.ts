import { describe, expect, it } from 'vitest'
import {
  ONTOLOGY_TYPES,
  ONTOLOGY_SCHEMA_URLS,
  buildConceptOntologyExtractionGuidance,
  normalizeEntitiesRecord,
  repairWikiArticleMarkdownHrefsForWeb,
  sanitizeLlmOutput,
} from './wiki.js'

describe('sanitizeLlmOutput', () => {
  it('parses tags and entities on consecutive lines', () => {
    const raw = `## Summary
Some content here.

Tags: graphql, json
Entities: {"people":["Alice"],"organizations":[]}`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['graphql', 'json'])
    expect(result.entities).toEqual({ people: ['Alice'], organizations: [] })
    expect(result.body).toBe('## Summary\nSome content here.')
  })

  it('parses tags when blank line separates Tags and Entities', () => {
    const raw = `## Summary
Some content here.

Tags: graphql, user-interface, json

Entities: {"people":[],"dates":["Q3 2024"]}`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['graphql', 'user-interface', 'json'])
    expect(result.entities).toEqual({ people: [], dates: ['Q3 2024'] })
    expect(result.body).toBe('## Summary\nSome content here.')
  })

  it('parses tags when Entities appears before Tags', () => {
    const raw = `## Summary
Some content here.

Entities: {"people":["Bob"]}
Tags: api, rest`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['api', 'rest'])
    expect(result.entities).toEqual({ people: ['Bob'] })
    expect(result.body).toBe('## Summary\nSome content here.')
  })

  it('parses tags when there are no entities', () => {
    const raw = `## Summary
Some content here.

Tags: audio, transcript`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['audio', 'transcript'])
    expect(result.entities).toEqual({})
    expect(result.body).toBe('## Summary\nSome content here.')
  })

  it('parses entities when there are no tags', () => {
    const raw = `## Summary
Some content here.

Entities: {"people":["Carol"]}`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual([])
    expect(result.entities).toEqual({ people: ['Carol'] })
    expect(result.body).toBe('## Summary\nSome content here.')
  })

  it('handles malformed entities JSON gracefully', () => {
    const raw = `## Summary
Content.

Tags: video, demo
Entities: {not valid json}`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['video', 'demo'])
    expect(result.entities).toEqual({})
    expect(result.body).toBe('## Summary\nContent.')
  })

  it('normalizes multi-word tags to hyphens', () => {
    const raw = `## Summary
Content.

Tags: machine learning, deep learning, ai`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['machine-learning', 'deep-learning', 'ai'])
  })

  it('strips markdown code fence wrapper', () => {
    const raw = '```markdown\n## Summary\nContent.\n\nTags: a, b\n```'

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['a', 'b'])
    expect(result.body).toBe('## Summary\nContent.')
  })

  it('strips YAML frontmatter the LLM may add', () => {
    const raw = `---
title: Test
---
## Summary
Content.

Tags: x, y`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['x', 'y'])
    expect(result.body).toBe('## Summary\nContent.')
  })

  it('returns body as-is when no tags or entities present', () => {
    const raw = `## Summary
Just plain content with no metadata lines.`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual([])
    expect(result.entities).toEqual({})
    expect(result.body).toBe('## Summary\nJust plain content with no metadata lines.')
  })

  it('handles multiple blank lines between tags and entities', () => {
    const raw = `## Summary
Content.

Tags: a, b, c


Entities: {"people":["Dave"]}`

    const result = sanitizeLlmOutput(raw)
    expect(result.tags).toEqual(['a', 'b', 'c'])
    expect(result.entities).toEqual({ people: ['Dave'] })
    expect(result.body).toBe('## Summary\nContent.')
  })
})

describe('normalizeEntitiesRecord', () => {
  it('keeps empty arrays and drops non-string array entries', () => {
    expect(
      normalizeEntitiesRecord({
        people: ['Ada', 1, '', 'Grace'],
        actors: [],
        'tv-series': ['Max Headroom'],
      }),
    ).toEqual({
      people: ['Ada', 'Grace'],
      actors: [],
      'tv-series': ['Max Headroom'],
    })
  })
})

describe('ontology vocabulary', () => {
  it('maps every ONTOLOGY_TYPES entry to a schema.org URL', () => {
    const keys = Object.keys(ONTOLOGY_SCHEMA_URLS)
    expect(keys.length).toBe(ONTOLOGY_TYPES.length)
    for (const t of ONTOLOGY_TYPES) {
      const url = ONTOLOGY_SCHEMA_URLS[t]
      expect(url).toMatch(/^https:\/\/schema\.org\//)
    }
  })

  it('buildConceptOntologyExtractionGuidance lists all allowed tokens', () => {
    const g = buildConceptOntologyExtractionGuidance()
    for (const t of ONTOLOGY_TYPES) {
      expect(g).toContain(`"${t}"`)
    }
  })
})

describe('repairWikiArticleMarkdownHrefsForWeb', () => {
  it('rewrites /output/wiki/... and strips .md', () => {
    const md =
      'See [Defer]( /output/wiki/sources/defer-stream.md ) and [G]( /output/wiki/concepts/graphql-directives.md ).'
    expect(repairWikiArticleMarkdownHrefsForWeb(md)).toBe(
      'See [Defer](/wiki/sources/defer-stream) and [G](/wiki/concepts/graphql-directives).',
    )
  })

  it('rewrites relative wiki/ paths and /wiki/...md', () => {
    const md = '[a](wiki/sources/foo-bar.md) [b](/wiki/concepts/baz.md)'
    expect(repairWikiArticleMarkdownHrefsForWeb(md)).toBe(
      '[a](/wiki/sources/foo-bar) [b](/wiki/concepts/baz)',
    )
  })

  it('preserves images and external URLs', () => {
    const md = '![x](https://ex/wiki/sources/nope) [y](https://a/b)'
    expect(repairWikiArticleMarkdownHrefsForWeb(md)).toBe(md)
  })

  it('leaves already-correct /wiki/ links unchanged', () => {
    const md = '[ok](/wiki/sources/defer-stream)'
    expect(repairWikiArticleMarkdownHrefsForWeb(md)).toBe(md)
  })
})
