import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { kbPaths, findKbRoot } from './paths.js'
import type { LocalModelPricingConfig } from './config.js'

// Cost per million tokens for supported models
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
}

const DEFAULT_COST = { input: 3, output: 15 }

type UsageBucket = {
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}

function createUsageBucket(): UsageBucket {
  return { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }
}

function createCallCostBucket(): { calls: number; costUsd: number } {
  return { calls: 0, costUsd: 0 }
}

function estimateDurationBasedLocalCost(
  durationMs: number,
  localModelPricing: LocalModelPricingConfig | undefined,
): number {
  if (!localModelPricing || localModelPricing.mode === 'zero') {
    return 0
  }

  const electricityUsdPerHour =
    (localModelPricing.powerWatts / 1000) * localModelPricing.electricityUsdPerKwh
  const totalHourlyCostUsd = electricityUsdPerHour + localModelPricing.hardwareUsdPerHour
  return (durationMs / 3_600_000) * totalHourlyCostUsd
}

function getDefaultCostRates(
  provider: string,
): { input: number; output: number } | null {
  if (provider === 'openai-compatible') return null
  return DEFAULT_COST
}

export function formatProviderModel(provider: string, model: string): string {
  return `${provider} / ${model}`
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  provider: string = 'openai',
  localModelPricing?: LocalModelPricingConfig,
  durationMs: number = 0,
): number {
  const rates = COST_PER_MILLION[model] ?? getDefaultCostRates(provider)
  if (!rates) {
    if (provider === 'openai-compatible') {
      return estimateDurationBasedLocalCost(durationMs, localModelPricing)
    }
    return 0
  }
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}

export interface LlmCallLog {
  timestamp: string
  action: string
  meta?: string | null
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  estimatedCostUsd: number
}

export interface StatsSummary {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  totalDurationMs: number
  byAction: Record<string, UsageBucket>
  byProvider: Record<string, UsageBucket>
  byModel: Record<string, UsageBucket>
  byActionPerModel: Record<string, Record<string, UsageBucket>>
  byDay: Record<string, { calls: number; costUsd: number }>
}

function getLogPath(): string | null {
  const root = findKbRoot()
  if (!root) return null
  return kbPaths(root).llmLog
}

export function logLlmCall(entry: LlmCallLog): void {
  const path = getLogPath()
  if (!path) return

  const dir = join(path, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  appendFileSync(path, JSON.stringify(entry) + '\n')
}

export function readLlmLogs(): LlmCallLog[] {
  const path = getLogPath()
  if (!path || !existsSync(path)) return []

  const content = readFileSync(path, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)

  return lines.map(line => {
    try {
      return JSON.parse(line) as LlmCallLog
    } catch {
      return null
    }
  }).filter((e): e is LlmCallLog => e !== null)
}

export function summarizeStats(logs: LlmCallLog[]): StatsSummary {
  const summary: StatsSummary = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    totalDurationMs: 0,
    byAction: {},
    byProvider: {},
    byModel: {},
    byActionPerModel: {},
    byDay: {},
  }

  for (const log of logs) {
    summary.totalCalls++
    summary.totalInputTokens += log.inputTokens
    summary.totalOutputTokens += log.outputTokens
    summary.totalCostUsd += log.estimatedCostUsd
    summary.totalDurationMs += log.durationMs

    if (!summary.byAction[log.action]) {
      summary.byAction[log.action] = createUsageBucket()
    }
    summary.byAction[log.action].calls++
    summary.byAction[log.action].inputTokens += log.inputTokens
    summary.byAction[log.action].outputTokens += log.outputTokens
    summary.byAction[log.action].costUsd += log.estimatedCostUsd
    summary.byAction[log.action].durationMs += log.durationMs

    if (!summary.byProvider[log.provider]) {
      summary.byProvider[log.provider] = createUsageBucket()
    }
    summary.byProvider[log.provider].calls++
    summary.byProvider[log.provider].inputTokens += log.inputTokens
    summary.byProvider[log.provider].outputTokens += log.outputTokens
    summary.byProvider[log.provider].costUsd += log.estimatedCostUsd
    summary.byProvider[log.provider].durationMs += log.durationMs

    const providerModel = formatProviderModel(log.provider, log.model)
    if (!summary.byModel[providerModel]) {
      summary.byModel[providerModel] = createUsageBucket()
    }
    summary.byModel[providerModel].calls++
    summary.byModel[providerModel].inputTokens += log.inputTokens
    summary.byModel[providerModel].outputTokens += log.outputTokens
    summary.byModel[providerModel].costUsd += log.estimatedCostUsd
    summary.byModel[providerModel].durationMs += log.durationMs

    if (!summary.byActionPerModel[log.action]) {
      summary.byActionPerModel[log.action] = {}
    }
    if (!summary.byActionPerModel[log.action][providerModel]) {
      summary.byActionPerModel[log.action][providerModel] = createUsageBucket()
    }
    summary.byActionPerModel[log.action][providerModel].calls++
    summary.byActionPerModel[log.action][providerModel].inputTokens += log.inputTokens
    summary.byActionPerModel[log.action][providerModel].outputTokens += log.outputTokens
    summary.byActionPerModel[log.action][providerModel].costUsd += log.estimatedCostUsd
    summary.byActionPerModel[log.action][providerModel].durationMs += log.durationMs

    const day = log.timestamp.slice(0, 10) // YYYY-MM-DD
    if (!summary.byDay[day]) {
      summary.byDay[day] = createCallCostBucket()
    }
    summary.byDay[day].calls++
    summary.byDay[day].costUsd += log.estimatedCostUsd
  }

  return summary
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(2)}`
  return `$${usd.toFixed(2)}`
}

export function printStatsSummary(summary: StatsSummary): void {
  console.log(`\n${pc.bold('LLM Usage Summary')}`)
  console.log(`  Total calls:    ${summary.totalCalls}`)
  console.log(`  Tokens:         ${formatTokens(summary.totalInputTokens)} in / ${formatTokens(summary.totalOutputTokens)} out`)
  console.log(`  AI time:        ${formatDuration(summary.totalDurationMs)}`)
  console.log(`  Est. cost:      ${formatCost(summary.totalCostUsd)}`)

  if (Object.keys(summary.byAction).length > 0) {
    console.log(`\n${pc.bold('By Action')}`)
    for (const [action, stats] of Object.entries(summary.byAction).sort((a, b) => b[1].calls - a[1].calls)) {
      console.log(`  ${action.padEnd(12)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}  ${formatTokens(stats.inputTokens + stats.outputTokens).padStart(8)} tokens`)
    }
  }

  if (Object.keys(summary.byProvider).length > 0) {
    console.log(`\n${pc.bold('By Provider')}`)
    for (const [provider, stats] of Object.entries(summary.byProvider).sort((a, b) => b[1].calls - a[1].calls)) {
      console.log(`  ${provider.padEnd(20)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}  ${formatTokens(stats.inputTokens + stats.outputTokens).padStart(8)} tokens`)
    }
  }

  if (Object.keys(summary.byModel).length > 0) {
    console.log(`\n${pc.bold('By Provider / Model')}`)
    for (const [model, stats] of Object.entries(summary.byModel).sort((a, b) => b[1].calls - a[1].calls)) {
      console.log(`  ${model.padEnd(44)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}`)
    }
  }

  const actionPerModelKeys = Object.keys(summary.byActionPerModel)
  if (actionPerModelKeys.length > 0) {
    console.log(`\n${pc.bold('By Action per Provider / Model')}`)
    for (const action of actionPerModelKeys.sort()) {
      const models = summary.byActionPerModel[action]
      const modelEntries = Object.entries(models).sort((a, b) => b[1].calls - a[1].calls)
      if (modelEntries.length > 0) {
        console.log(`  ${pc.cyan(action)}:`)
        for (const [model, stats] of modelEntries) {
          console.log(`    ${model.padEnd(42)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}  ${formatTokens(stats.inputTokens + stats.outputTokens).padStart(8)} tokens`)
        }
      }
    }
  }

  const recentDays = Object.entries(summary.byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)
  if (recentDays.length > 0) {
    console.log(`\n${pc.bold('Last ${recentDays.length} Days')}`)
    for (const [day, stats] of recentDays) {
      console.log(`  ${day}  ${String(stats.calls).padStart(3)} calls  ${formatCost(stats.costUsd).padStart(8)}`)
    }
  }
}
