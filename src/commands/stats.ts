import { Command } from 'commander'
import pc from 'picocolors'
import { readLlmLogs, summarizeStats } from '../lib/llm-stats.js'
import { formatDuration } from '../lib/utils.js'

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

    // Cost breakdown by source
    const costParts: string[] = []
    if (summary.totalActualCostUsd > 0) costParts.push(`${formatCost(summary.totalActualCostUsd)} actual`)
    if (summary.totalEstimatedCostUsd > 0) costParts.push(`${formatCost(summary.totalEstimatedCostUsd)} est.`)
    if (summary.totalFreeCostUsd > 0) costParts.push(`${formatCost(summary.totalFreeCostUsd)} free`)

    if (costParts.length > 1) {
      console.log(`  Cost:           ${formatCost(summary.totalCostUsd)} (${costParts.join(' + ')})`)
    } else {
      console.log(`  Cost:           ${formatCost(summary.totalCostUsd)}`)
    }

    // Call source breakdown
    const estimatedCalls = filteredLogs.filter(l => l.costSource === 'estimated').length
    const actualCalls = filteredLogs.filter(l => l.costSource === 'actual').length
    const freeCalls = filteredLogs.filter(l => l.costSource === 'free').length

    if (estimatedCalls > 0 || actualCalls > 0 || freeCalls > 0) {
      const callParts: string[] = []
      if (actualCalls > 0) callParts.push(`${actualCalls} actual`)
      if (estimatedCalls > 0) callParts.push(`${estimatedCalls} est.`)
      if (freeCalls > 0) callParts.push(`${freeCalls} free`)
      console.log(`  Calls:          ${summary.totalCalls.toLocaleString()} (${callParts.join(' + ')})`)
    }

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
      console.log(`\n${pc.bold('Daily Activity (Last 7 Days)')}`)
      for (const [day, stats] of recentDays) {
        console.log(`  ${day}  ${String(stats.calls).padStart(3)} calls  ${formatCost(stats.costUsd).padStart(8)}`)
      }
    }

    console.log()
  })

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
