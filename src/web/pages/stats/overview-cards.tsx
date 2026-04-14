/** @jsxImportSource hono/jsx */
import type { StatsSummary } from '../../../lib/llm-stats.js'
import { formatCost } from '../../../lib/llm-stats.js'
import { formatDuration } from '../../../lib/utils.js'
import { formatTokens } from './utils.js'

interface OverviewCardsProps {
  summary: StatsSummary
}

function Card({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline relative z-[10001]">
      <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div class="text-zinc-100 text-2xl font-bold">{value}</div>
      {subtext && <div class="text-xs text-zinc-500 mt-1">{subtext}</div>}
    </div>
  )
}

export function OverviewCards({ summary }: OverviewCardsProps) {
  const costSubtext = (summary.totalEstimatedCostUsd > 0 || summary.totalActualCostUsd > 0 || summary.totalFreeCostUsd > 0)
    ? [
        summary.totalEstimatedCostUsd > 0 && `${formatCost(summary.totalEstimatedCostUsd, 'estimated')}`,
        summary.totalActualCostUsd > 0 && `${formatCost(summary.totalActualCostUsd, 'actual')}`,
        summary.totalFreeCostUsd > 0 && `${formatCost(summary.totalFreeCostUsd, 'free')}`,
      ].filter(Boolean).join(' ')
    : undefined

  return (
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card label="Total Calls" value={summary.totalCalls.toLocaleString()} />
      <Card label="Total Tokens" value={formatTokens(summary.totalInputTokens + summary.totalOutputTokens)} />
      <Card label="AI Time" value={formatDuration(summary.totalDurationMs)} />
      <Card label="Cost" value={formatCost(summary.totalCostUsd)} subtext={costSubtext} />
    </div>
  )
}
