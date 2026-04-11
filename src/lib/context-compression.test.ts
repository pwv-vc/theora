import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getEffectiveContextCompression,
  maybeCompressContext,
} from './context-compression.js'
import type { KbConfig } from './config.js'

const ORIGINAL_ENV = { ...process.env }

function testKb(over: Partial<KbConfig> = {}): KbConfig {
  return {
    name: 'test',
    created: '2020-01-01T00:00:00.000Z',
    provider: 'openai',
    model: 'gpt-4o',
    compileConcurrency: 3,
    conceptSummaryChars: 3000,
    conceptMin: 5,
    conceptMax: 10,
    ...over,
  } as KbConfig
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

describe('getEffectiveContextCompression', () => {
  it('defaults to none', () => {
    const eff = getEffectiveContextCompression(testKb())
    expect(eff.provider).toBe('none')
    expect(eff.minChars).toBe(4096)
    expect(eff.applyToTranscripts).toBe(false)
  })

  it('reads config provider and minChars', () => {
    const eff = getEffectiveContextCompression(
      testKb({
        contextCompression: {
          provider: 'caveman-nlp',
          minChars: 100,
          applyToTranscripts: true,
        },
      }),
    )
    expect(eff.provider).toBe('caveman-nlp')
    expect(eff.minChars).toBe(100)
    expect(eff.applyToTranscripts).toBe(true)
  })

  it('env overrides config', () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'token-company'
    process.env.CONTEXT_COMPRESSION_MIN_CHARS = '2000'
    process.env.CONTEXT_COMPRESSION_APPLY_TO_TRANSCRIPTS = 'true'
    const eff = getEffectiveContextCompression(
      testKb({ contextCompression: { provider: 'caveman-nlp', minChars: 500 } }),
    )
    expect(eff.provider).toBe('token-company')
    expect(eff.minChars).toBe(2000)
    expect(eff.applyToTranscripts).toBe(true)
  })

  it('throws on unknown provider', () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'not-a-real-provider'
    expect(() => getEffectiveContextCompression(testKb())).toThrow('Unknown context compression')
  })
})

describe('maybeCompressContext', () => {
  it('returns input unchanged when provider is none', async () => {
    const input = 'a'.repeat(5000)
    const r = await maybeCompressContext(input, testKb())
    expect(r.text).toBe(input)
    expect(r.compression).toBeNull()
  })

  it('skips when below minChars', async () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'token-company'
    process.env.TTC_API_KEY = 'secret'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const input = 'short'
    const r = await maybeCompressContext(input, testKb({ contextCompression: { minChars: 4096 } }))
    expect(r.text).toBe(input)
    expect(r.compression).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls Token Company when configured', async () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'token-company'
    process.env.TTC_API_KEY = 'secret-key'
    process.env.CONTEXT_COMPRESSION_MIN_CHARS = '1'

    const fetchMock = vi.fn(
      async (): Promise<Response> =>
        ({
          ok: true,
          json: async () => ({ output: 'out' }),
        }) as Response,
    )
    vi.stubGlobal('fetch', fetchMock)

    const input = 'x'.repeat(100)
    const r = await maybeCompressContext(input, testKb())
    expect(r.text).toBe('out')
    expect(r.compression).toEqual({
      provider: 'token-company',
      preChars: 100,
      postChars: 3,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    const body = JSON.parse((init?.body as string) ?? '{}')
    expect(body.input).toBe(input)
    expect(body.model).toBe('bear-1.2')
  })

  it('throws when Token Company returns HTTP error', async () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'token-company'
    process.env.TTC_API_KEY = 'secret-key'
    process.env.CONTEXT_COMPRESSION_MIN_CHARS = '1'

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (): Promise<Response> =>
          ({
            ok: false,
            status: 401,
            text: async () => 'unauthorized',
          }) as Response,
      ),
    )

    await expect(maybeCompressContext('y'.repeat(50), testKb())).rejects.toThrow('HTTP 401')
  })

  it('throws when Caveman is selected but root is missing', async () => {
    process.env.CONTEXT_COMPRESSION_PROVIDER = 'caveman-nlp'
    process.env.CONTEXT_COMPRESSION_MIN_CHARS = '1'

    await expect(maybeCompressContext('z'.repeat(80), testKb())).rejects.toThrow(
      'CAVEMAN_COMPRESSION_ROOT',
    )
  })
})
