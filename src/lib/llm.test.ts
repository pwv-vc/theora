import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDefaultActionModels } from './config.js'
import {
  getOpenAI,
  getOpenAiCompatibleClientConfig,
  normalizeOpenAiUsage,
  resetOpenAiClientCache,
  resolveProvider,
} from './llm.js'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  resetOpenAiClientCache()
  process.env = { ...ORIGINAL_ENV }
})

afterEach(() => {
  resetOpenAiClientCache()
  process.env = { ...ORIGINAL_ENV }
})

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

describe('openai-compatible config', () => {
  it('uses provider-aware default action models when resolving the model', () => {
    const model = 'llama3.1:8b'

    expect(resolveProvider(
      { action: 'compile' },
      {
        provider: 'openai-compatible',
        model,
        models: getDefaultActionModels('openai-compatible', model),
      },
    )).toEqual({
      provider: 'openai-compatible',
      model,
    })
  })

  it('builds compatible client config with an empty default api key', () => {
    expect(getOpenAiCompatibleClientConfig({
      OPENAI_COMPATIBLE_BASE_URL: 'http://localhost:11434/v1',
    })).toEqual({
      apiKey: '',
      baseURL: 'http://localhost:11434/v1',
    })
  })

  it('rejects invalid compatible base urls early', () => {
    expect(() => getOpenAiCompatibleClientConfig({
      OPENAI_COMPATIBLE_BASE_URL: 'localhost:11434/v1',
    })).toThrow('OPENAI_COMPATIBLE_BASE_URL must be a valid http(s) URL')
  })

  it('rejects base urls with path traversal', () => {
    expect(() => getOpenAiCompatibleClientConfig({
      OPENAI_COMPATIBLE_BASE_URL: 'http://localhost:11434/v1/../etc/passwd',
    })).toThrow('OPENAI_COMPATIBLE_BASE_URL must be a valid http(s) URL')
  })

  it('caches clients per provider without collisions', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:11434/v1'

    const openAiClient = getOpenAI('openai')
    const secondOpenAiClient = getOpenAI('openai')
    const compatibleClient = getOpenAI('openai-compatible')
    const secondCompatibleClient = getOpenAI('openai-compatible')

    expect(openAiClient).toBe(secondOpenAiClient)
    expect(compatibleClient).toBe(secondCompatibleClient)
    expect(openAiClient).not.toBe(compatibleClient)
  })
})
