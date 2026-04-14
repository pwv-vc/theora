/** @jsxImportSource hono/jsx */
import type { StatsSummary } from '../../../lib/llm-stats.js'
import { formatCost } from '../../../lib/llm-stats.js'

interface CostBreakdownProps {
  summary: StatsSummary
}

function BreakdownCard({
  label,
  amount,
  totalCost,
  calls,
  totalCalls,
  colorClass
}: {
  label: string
  amount: number
  totalCost: number
  calls: number
  totalCalls: number
  colorClass: string
}) {
  return (
    <div class="bg-zinc-800/50 rounded-lg p-4">
      <div class={`text-xs uppercase tracking-wider mb-1 ${colorClass}`}>{label}</div>
      <div class="text-zinc-100 text-xl font-bold">{formatCost(amount)}</div>
      <div class="text-zinc-500 text-xs mt-1">
        {((amount / totalCost) * 100).toFixed(1)}% of cost
        {calls > 0 && (
          <span> · {calls} calls ({((calls / totalCalls) * 100).toFixed(0)}%)</span>
        )}
      </div>
    </div>
  )
}

export function CostBreakdown({ summary }: CostBreakdownProps) {
  const hasAnyCost = summary.totalEstimatedCostUsd > 0 || summary.totalActualCostUsd > 0 || summary.totalFreeCostUsd > 0

  if (!hasAnyCost) return null

  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 no-scanline relative z-[10001]">
      <h2 class="text-lg font-semibold mb-4 text-zinc-100">Cost Breakdown</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.totalActualCostUsd > 0 && (
          <BreakdownCard
            label="Actual"
            amount={summary.totalActualCostUsd}
            totalCost={summary.totalCostUsd}
            calls={summary.totalActualCalls}
            totalCalls={summary.totalCalls}
            colorClass="text-zinc-400"
          />
        )}
        {summary.totalEstimatedCostUsd > 0 && (
          <BreakdownCard
            label="Estimated"
            amount={summary.totalEstimatedCostUsd}
            totalCost={summary.totalCostUsd}
            calls={summary.totalEstimatedCalls}
            totalCalls={summary.totalCalls}
            colorClass="text-zinc-400"
          />
        )}
        {summary.totalFreeCostUsd > 0 && (
          <BreakdownCard
            label="Free"
            amount={summary.totalFreeCostUsd}
            totalCost={summary.totalCostUsd}
            calls={summary.totalFreeCalls}
            totalCalls={summary.totalCalls}
            colorClass="text-zinc-400"
          />
        )}
      </div>
    </div>
  )
}
