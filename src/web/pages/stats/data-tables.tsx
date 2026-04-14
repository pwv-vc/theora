/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'
import type { StatsSummary } from '../../../lib/llm-stats.js'
import { formatCost } from '../../../lib/llm-stats.js'
import { formatTokens } from './utils.js'

interface DataTablesProps {
  summary: StatsSummary
}

function Table({ children }: { children: Child }) {
  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 no-scanline relative z-[10001]">
      {children}
    </div>
  )
}

function TableHeader({ title }: { title: string }) {
  return <h2 class="text-lg font-semibold mb-4 text-zinc-100">{title}</h2>
}

export function ByActionTable({ summary }: DataTablesProps) {
  const entries = Object.entries(summary.byAction).sort((a, b) => b[1].calls - a[1].calls)
  if (entries.length === 0) return null

  return (
    <Table>
      <TableHeader title="By Action" />
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800">
            <th class="text-left py-2 text-zinc-400 font-medium">Action</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([action, stats]) => (
            <tr key={action} class="border-b last:border-0 border-zinc-800">
              <td class="py-2 capitalize text-zinc-300">{action}</td>
              <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
              <td class="text-right py-2 text-zinc-300">
                {formatCost(stats.costUsd)}
                {(stats.estimatedCostUsd > 0 || stats.actualCostUsd > 0 || stats.freeCostUsd > 0) && (
                  <span class="text-xs text-zinc-500 ml-1">
                    ({stats.estimatedCostUsd > 0 && <span>est. {formatCost(stats.estimatedCostUsd)} </span>}
                    {stats.actualCostUsd > 0 && <span>actual {formatCost(stats.actualCostUsd)} </span>}
                    {stats.freeCostUsd > 0 && <span>free {formatCost(stats.freeCostUsd)}</span>})</span>
                )}
              </td>
              <td class="text-right py-2 text-zinc-300">{formatTokens(stats.inputTokens + stats.outputTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  )
}

export function ByProviderTable({ summary }: DataTablesProps) {
  const entries = Object.entries(summary.byProvider).sort((a, b) => b[1].calls - a[1].calls)
  if (entries.length === 0) return null

  return (
    <Table>
      <TableHeader title="By Provider" />
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800">
            <th class="text-left py-2 text-zinc-400 font-medium">Provider</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([provider, stats]) => (
            <tr key={provider} class="border-b last:border-0 border-zinc-800">
              <td class="py-2 text-zinc-300">{provider}</td>
              <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
              <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
              <td class="text-right py-2 text-zinc-300">{formatTokens(stats.inputTokens + stats.outputTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  )
}

export function ByModelTable({ summary }: DataTablesProps) {
  const entries = Object.entries(summary.byModel).sort((a, b) => b[1].calls - a[1].calls)
  if (entries.length === 0) return null

  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
      <h2 class="text-lg font-semibold mb-4 text-zinc-100">By Provider / Model</h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800">
            <th class="text-left py-2 text-zinc-400 font-medium">Provider / Model</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
            <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([model, stats]) => (
            <tr key={model} class="border-b last:border-0 border-zinc-800">
              <td class="py-2 font-mono text-xs text-zinc-300">{model}</td>
              <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
              <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ByActionPerModelTable({ summary }: DataTablesProps) {
  const entries = Object.entries(summary.byActionPerModel).sort((a, b) => a[0].localeCompare(b[0]))
  if (entries.length === 0) return null

  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
      <h2 class="text-lg font-semibold mb-4 text-zinc-100">By Action per Provider / Model</h2>
      <div class="space-y-4">
        {entries.map(([action, models]) => {
          const modelEntries = Object.entries(models).sort((a, b) => b[1].calls - a[1].calls)
          return (
            <div key={action} class="border-b last:border-0 border-zinc-800 pb-4 last:pb-0">
              <h3 class="font-medium text-zinc-300 capitalize mb-2">{action}</h3>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-zinc-800">
                    <th class="text-left py-1 text-zinc-400 font-medium">Provider / Model</th>
                    <th class="text-right py-1 text-zinc-400 font-medium">Calls</th>
                    <th class="text-right py-1 text-zinc-400 font-medium">Cost</th>
                    <th class="text-right py-1 text-zinc-400 font-medium">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {modelEntries.map(([model, stats]) => (
                    <tr key={model} class="border-b last:border-0 border-zinc-800">
                      <td class="py-1 font-mono text-xs text-zinc-300">{model}</td>
                      <td class="text-right py-1 text-zinc-300">{stats.calls}</td>
                      <td class="text-right py-1 text-zinc-300">{formatCost(stats.costUsd)}</td>
                      <td class="text-right py-1 text-zinc-300">{formatTokens(stats.inputTokens + stats.outputTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DailyActivityTable({ summary }: DataTablesProps) {
  const entries = Object.entries(summary.byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  if (entries.length === 0) return null

  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-6 no-scanline relative z-[10001]">
      <h2 class="text-lg font-semibold mb-4 text-zinc-100">Daily Activity</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800">
              <th class="text-left py-2 text-zinc-400 font-medium">Date</th>
              <th class="text-right py-2 text-zinc-400 font-medium">Calls</th>
              <th class="text-right py-2 text-zinc-400 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([day, stats]) => (
              <tr key={day} class="border-b last:border-0 border-zinc-800">
                <td class="py-2 text-zinc-300">{day}</td>
                <td class="text-right py-2 text-zinc-300">{stats.calls}</td>
                <td class="text-right py-2 text-zinc-300">{formatCost(stats.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
