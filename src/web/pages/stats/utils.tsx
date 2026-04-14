/** @jsxImportSource hono/jsx */
import type { CostSource } from '../../../lib/llm-stats.js'
import { formatCost } from '../../../lib/llm-stats.js'

export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

export function formatCostWithSource(usd: number, source?: CostSource): string {
  return formatCost(usd, source)
}
