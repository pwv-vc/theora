/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

export function Card({ href, children }: { href: string; children: Child }) {
  return (
    <a href={href} class="block group">
      <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800 transition-all no-scanline" style="position: relative; z-index: 10001;">
        {children}
      </div>
    </a>
  )
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 no-scanline" style="position: relative; z-index: 10001;">
      <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div class="text-zinc-100 text-lg font-bold">{value}</div>
    </div>
  )
}

export function Panel({ children, class: cls }: { children: Child; class?: string }) {
  return (
    <div class={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 no-scanline ${cls ?? ''}`} style="position: relative; z-index: 10001;">
      {children}
    </div>
  )
}

export function LogPanel({ id, class: cls }: { id: string; class?: string }) {
  return (
    <pre
      id={id}
      class={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-400 text-xs leading-relaxed font-mono overflow-auto max-h-96 whitespace-pre-wrap no-scanline ${cls ?? ''}`}
    />
  )
}
