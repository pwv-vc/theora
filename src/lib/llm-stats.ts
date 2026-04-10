import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { kbPaths, findKbRoot } from './paths.js'

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

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_MILLION[model] ?? DEFAULT_COST
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}

export interface LlmCallLog {
  timestamp: string
  action: string
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
  byAction: Record<string, {
    calls: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    durationMs: number
  }>
  byModel: Record<string, {
    calls: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    durationMs: number
  }>
  byActionPerModel: Record<string, Record<string, {
    calls: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    durationMs: number
  }>>
  byDay: Record<string, {
    calls: number
    costUsd: number
  }>
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

    // By action
    if (!summary.byAction[log.action]) {
      summary.byAction[log.action] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }
    }
    summary.byAction[log.action].calls++
    summary.byAction[log.action].inputTokens += log.inputTokens
    summary.byAction[log.action].outputTokens += log.outputTokens
    summary.byAction[log.action].costUsd += log.estimatedCostUsd
    summary.byAction[log.action].durationMs += log.durationMs

    // By model
    if (!summary.byModel[log.model]) {
      summary.byModel[log.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }
    }
    summary.byModel[log.model].calls++
    summary.byModel[log.model].inputTokens += log.inputTokens
    summary.byModel[log.model].outputTokens += log.outputTokens
    summary.byModel[log.model].costUsd += log.estimatedCostUsd
    summary.byModel[log.model].durationMs += log.durationMs

    // By action per model
    if (!summary.byActionPerModel[log.action]) {
      summary.byActionPerModel[log.action] = {}
    }
    if (!summary.byActionPerModel[log.action][log.model]) {
      summary.byActionPerModel[log.action][log.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }
    }
    summary.byActionPerModel[log.action][log.model].calls++
    summary.byActionPerModel[log.action][log.model].inputTokens += log.inputTokens
    summary.byActionPerModel[log.action][log.model].outputTokens += log.outputTokens
    summary.byActionPerModel[log.action][log.model].costUsd += log.estimatedCostUsd
    summary.byActionPerModel[log.action][log.model].durationMs += log.durationMs

    // By day
    const day = log.timestamp.slice(0, 10) // YYYY-MM-DD
    if (!summary.byDay[day]) {
      summary.byDay[day] = { calls: 0, costUsd: 0 }
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

  if (Object.keys(summary.byModel).length > 0) {
    console.log(`\n${pc.bold('By Model')}`)
    for (const [model, stats] of Object.entries(summary.byModel).sort((a, b) => b[1].calls - a[1].calls)) {
      console.log(`  ${model.padEnd(30)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}`)
    }
  }

  // By Action per Model
  const actionPerModelKeys = Object.keys(summary.byActionPerModel)
  if (actionPerModelKeys.length > 0) {
    console.log(`\n${pc.bold('By Action per Model')}`)
    for (const action of actionPerModelKeys.sort()) {
      const models = summary.byActionPerModel[action]
      const modelEntries = Object.entries(models).sort((a, b) => b[1].calls - a[1].calls)
      if (modelEntries.length > 0) {
        console.log(`  ${pc.cyan(action)}:`)
        for (const [model, stats] of modelEntries) {
          console.log(`    ${model.padEnd(28)} ${String(stats.calls).padStart(4)} calls  ${formatCost(stats.costUsd).padStart(8)}  ${formatTokens(stats.inputTokens + stats.outputTokens).padStart(8)} tokens`)
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