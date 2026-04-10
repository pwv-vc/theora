import { describe, expect, it } from 'vitest'
import { getDefaultLocalModelPricing } from './config.js'
import { estimateCost, summarizeStats } from './llm-stats.js'

describe('estimateCost', () => {
  it('uses configurable duration-based fallback pricing for unknown openai-compatible models', () => {
    expect(
      estimateCost('llama3.2', 1000, 500, 'openai-compatible', getDefaultLocalModelPricing(), 60_000),
    ).toBeCloseTo(0.0064583333, 8)
  })

  it('keeps known pricing for recognized models on compatible providers', () => {
    expect(estimateCost('gpt-4o', 1000, 500, 'openai-compatible')).toBe(0.0075)
  })

  it('lets users tune duration-based local pricing', () => {
    const localModelPricing = getDefaultLocalModelPricing()
    localModelPricing.powerWatts = 400
    localModelPricing.electricityUsdPerKwh = 0.2
    localModelPricing.hardwareUsdPerHour = 0.5

    expect(
      estimateCost('gemma-4-E2B-it', 1000, 500, 'openai-compatible', localModelPricing, 120_000),
    ).toBeCloseTo(0.0193333333, 8)
  })

  it('can disable fallback local model pricing', () => {
    const localModelPricing = getDefaultLocalModelPricing()
    localModelPricing.mode = 'zero'

    expect(estimateCost('llama3.2', 1000, 500, 'openai-compatible', localModelPricing, 60_000)).toBe(0)
  })
})

describe('summarizeStats', () => {
  it('separates usage by provider and provider/model', () => {
    const summary = summarizeStats([
      {
        timestamp: '2026-04-10T10:00:00.000Z',
        action: 'ask',
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 250,
        estimatedCostUsd: 0.001,
      },
      {
        timestamp: '2026-04-10T11:00:00.000Z',
        action: 'ask',
        provider: 'openai-compatible',
        model: 'gpt-4o',
        inputTokens: 80,
        outputTokens: 40,
        durationMs: 200,
        estimatedCostUsd: 0,
      },
    ])

    expect(summary.byProvider.openai.calls).toBe(1)
    expect(summary.byProvider['openai-compatible'].calls).toBe(1)
    expect(summary.byModel['openai / gpt-4o'].calls).toBe(1)
    expect(summary.byModel['openai-compatible / gpt-4o'].calls).toBe(1)
    expect(summary.byActionPerModel.ask['openai-compatible / gpt-4o'].inputTokens).toBe(80)
  })
})
