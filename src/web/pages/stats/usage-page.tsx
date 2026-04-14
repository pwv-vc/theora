/** @jsxImportSource hono/jsx */
import type { StatsSummary } from '../../../lib/llm-stats.js'
import type { KbConfig } from '../../../lib/config.js'
import { getKbName } from '../../../lib/config.js'
import { PageHeader } from '../ui/index.js'
import { OverviewCards } from './overview-cards.js'
import { CostBreakdown } from './cost-breakdown.js'
import { ByActionTable, ByProviderTable, ByModelTable, ByActionPerModelTable, DailyActivityTable } from './data-tables.js'

interface UsagePageProps {
  summary: StatsSummary
  days: number
  config: KbConfig
}

function DaySelector({ days }: { days: number }) {
  const dayOptions = [7, 30, 90]
  return (
    <div class="flex items-center justify-end mb-8 gap-2">
      {dayOptions.map(option => (
        <a
          href={`/stats/usage?days=${option}`}
          class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            days === option
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'bg-transparent text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
          }`}
        >
          {option} days
        </a>
      ))}
    </div>
  )
}

export function StatsUsagePage({ summary, days, config }: UsagePageProps) {
  return (
    <div>
      <PageHeader title="Usage" subtitle={`LLM usage for the ${getKbName(config)} wiki.`} />
      <DaySelector days={days} />
      <OverviewCards summary={summary} />
      <CostBreakdown summary={summary} />
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ByActionTable summary={summary} />
        <ByProviderTable summary={summary} />
      </div>
      <ByModelTable summary={summary} />
      <ByActionPerModelTable summary={summary} />
      <DailyActivityTable summary={summary} />
    </div>
  )
}
