import { Command } from 'commander'
import pc from 'picocolors'
import { readLlmLogs, summarizeStats } from '../lib/llm-stats.js'

export const statsCommand = new Command('stats')
  .description('Show LLM usage statistics')
  .option('--days <n>', 'show stats for last n days', '30')
  .option('--json', 'output as JSON')
  .action(async (options: { days: string; json?: boolean }) => {
    const logs = readLlmLogs()

    if (logs.length === 0) {
      console.log(pc.gray('No LLM calls recorded yet.'))
      return
    }

    // Filter by days if specified
    const days = parseInt(options.days, 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoff)

    if (filteredLogs.length === 0) {
      console.log(pc.gray(`No LLM calls in the last ${days} days.`))
      return
    }

    const summary = summarizeStats(filteredLogs)

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2))
      return
    }

    // Print summary
    console.log(`\n${pc.bold('LLM Usage Statistics')}`)
    console.log(pc.gray(`  Last ${days} days · ${filteredLogs.length} calls\n`))

    console.log(`${pc.bold('Overview')}`)
    console.log(`  Total calls:    ${summary.totalCalls.toLocaleString()}`)
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

    const recentDays = Object.entries(summary.byDay)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
    if (recentDays.length > 0) {
      console.log(`\n${pc.bold('Daily Activity (Last 7 Days)')}`)
      for (const [day, stats] of recentDays) {
        console.log(`  ${day}  ${String(stats.calls).padStart(3)} calls  ${formatCost(stats.costUsd).padStart(8)}`)
      }
    }

    console.log()
  })

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