/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div class="mb-6">
      <h1 class="text-xl font-bold text-zinc-100 mb-1">{title}</h1>
      {subtitle && <p class="text-zinc-500 text-sm">{subtitle}</p>}
    </div>
  )
}

export function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div class="flex items-center gap-3 mb-4">
      <h2 class="text-zinc-100 font-bold text-sm uppercase tracking-wider">{title}</h2>
      <span class="text-zinc-600 text-xs">{count}</span>
    </div>
  )
}

export function SectionLabel({ children }: { children: Child }) {
  return (
    <div class="text-zinc-600 text-xs uppercase tracking-wider">{children}</div>
  )
}

export function EmptyState({ children }: { children: Child }) {
  return (
    <div class="border border-zinc-800 rounded-lg p-8 text-center no-scanline">
      {children}
    </div>
  )
}
