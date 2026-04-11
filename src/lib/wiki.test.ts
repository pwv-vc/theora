import { describe, expect, it } from 'vitest'
import { sanitizeLlmOutput } from './wiki.js'

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
