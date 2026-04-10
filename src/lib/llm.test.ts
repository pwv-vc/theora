import { describe, expect, it } from 'vitest'
import { normalizeOpenAiUsage } from './llm.js'

describe('normalizeOpenAiUsage', () => {
  it('uses standard OpenAI usage fields when present', () => {
    expect(
      normalizeOpenAiUsage(
        { prompt_tokens: 123, completion_tokens: 45 },
        'ignored input',
        'ignored output',
      ),
    ).toEqual({ inputTokens: 123, outputTokens: 45 })
  })

  it('supports compatible-provider token aliases', () => {
    expect(
      normalizeOpenAiUsage(
        { prompt_eval_count: 77, eval_count: 19 },
        'ignored input',
        'ignored output',
      ),
    ).toEqual({ inputTokens: 77, outputTokens: 19 })
  })

  it('falls back to estimating tokens from text when usage is missing', () => {
    expect(normalizeOpenAiUsage(undefined, '12345678', '12345')).toEqual({
      inputTokens: 2,
      outputTokens: 2,
    })
  })
})
