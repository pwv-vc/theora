import { describe, expect, it } from 'vitest'
import { estimateCost, summarizeStats } from './llm-stats.js'

describe('estimateCost', () => {
  it('returns zero for unknown openai-compatible models', () => {
    expect(estimateCost('llama3.2', 1000, 500, 'openai-compatible')).toBe(0)
  })

  it('keeps known pricing for recognized models on compatible providers', () => {
    expect(estimateCost('gpt-4o', 1000, 500, 'openai-compatible')).toBe(0.0075)
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
