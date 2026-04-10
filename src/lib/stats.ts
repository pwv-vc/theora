import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { findKbRoot } from './paths.js'

export interface LlmCallStats {
  inputTokens: number
  outputTokens: number
  durationMs: number
  model: string
  provider: string
}

export interface SessionStats {
  llmCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalLlmTimeMs: number
  estimatedCostUsd: number
  startTime: number
}

export interface CumulativeStats {
  totalLlmCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalLlmTimeMs: number
  totalEstimatedCostUsd: number
  totalIngestFiles: number
  totalCompileRuns: number
  totalAskQueries: number
  lastUpdated: string
}

const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
}

const DEFAULT_COST = { input: 3, output: 15 }

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_MILLION[model] ?? DEFAULT_COST
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}

// --- Session tracker (in-memory, per command run) ---

let session: SessionStats = {
  llmCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalLlmTimeMs: 0,
  estimatedCostUsd: 0,
  startTime: Date.now(),
}

export function resetSession(): void {
  session = {
    llmCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalLlmTimeMs: 0,
    estimatedCostUsd: 0,
    startTime: Date.now(),
  }
}

export function recordLlmCall(call: LlmCallStats): void {
  const cost = estimateCost(call.model, call.inputTokens, call.outputTokens)
  session.llmCalls++
  session.totalInputTokens += call.inputTokens
  session.totalOutputTokens += call.outputTokens
  session.totalLlmTimeMs += call.durationMs
  session.estimatedCostUsd += cost
}

export function getSession(): SessionStats {
  return { ...session }
}

// --- Cumulative stats (persisted to .theora/stats.json) ---

function statsPath(): string | null {
  const root = findKbRoot()
  if (!root) return null
  return join(root, '.theora', 'stats.json')
}

function readCumulativeStats(): CumulativeStats {
  const path = statsPath()
  if (!path || !existsSync(path)) {
    return {
      totalLlmCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalLlmTimeMs: 0,
      totalEstimatedCostUsd: 0,
      totalIngestFiles: 0,
      totalCompileRuns: 0,
      totalAskQueries: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeCumulativeStats(stats: CumulativeStats): void {
  const path = statsPath()
  if (!path) return
  const dir = join(path, '..')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(stats, null, 2) + '\n')
}

export function persistSession(command: 'compile' | 'ask' | 'lint' | 'ingest', extra?: { filesIngested?: number }): void {
  const cumulative = readCumulativeStats()

  cumulative.totalLlmCalls += session.llmCalls
  cumulative.totalInputTokens += session.totalInputTokens
  cumulative.totalOutputTokens += session.totalOutputTokens
  cumulative.totalLlmTimeMs += session.totalLlmTimeMs
  cumulative.totalEstimatedCostUsd += session.estimatedCostUsd
  cumulative.lastUpdated = new Date().toISOString()

  if (command === 'compile') cumulative.totalCompileRuns++
  if (command === 'ask') cumulative.totalAskQueries++
  if (command === 'ingest' && extra?.filesIngested) cumulative.totalIngestFiles += extra.filesIngested

  writeCumulativeStats(cumulative)
}

// --- Display ---

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = (secs % 60).toFixed(0)
  return `${mins}m ${remainSecs}s`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

export function printSessionStats(): void {
  if (session.llmCalls === 0) return

  const elapsed = Date.now() - session.startTime
  const parts = [
    `${session.llmCalls} LLM call${session.llmCalls !== 1 ? 's' : ''}`,
    `${formatTokens(session.totalInputTokens)} in / ${formatTokens(session.totalOutputTokens)} out`,
    `${formatDuration(session.totalLlmTimeMs)} AI time`,
    `${formatDuration(elapsed)} total`,
    `~${formatCost(session.estimatedCostUsd)}`,
  ]
  console.log(pc.gray(parts.join(' · ')))
}

export function printCumulativeStats(): void {
  const stats = readCumulativeStats()
  if (stats.totalLlmCalls === 0) {
    console.log(pc.gray('No stats recorded yet.'))
    return
  }

  console.log(pc.bold('Cumulative Stats'))
  console.log(`  LLM calls:    ${stats.totalLlmCalls}`)
  console.log(`  Tokens:       ${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out`)
  console.log(`  AI time:      ${formatDuration(stats.totalLlmTimeMs)}`)
  console.log(`  Est. cost:    ~${formatCost(stats.totalEstimatedCostUsd)}`)
  console.log(`  Compiles:     ${stats.totalCompileRuns}`)
  console.log(`  Questions:    ${stats.totalAskQueries}`)
  console.log(`  Files ingest: ${stats.totalIngestFiles}`)
  console.log(pc.gray(`  Last updated: ${stats.lastUpdated}`))
}
