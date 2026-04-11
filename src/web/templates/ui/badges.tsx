/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

type PillVariant = 'default' | 'type' | 'ontology' | 'entity'

const pillStyles: Record<PillVariant, string> = {
  default:  'bg-zinc-700 border border-zinc-600 text-zinc-500 text-xs px-1.5 py-0.5 rounded no-scanline',
  type:     'bg-zinc-700 border border-zinc-600 text-zinc-500 text-xs px-2 py-0.5 rounded uppercase tracking-wider no-scanline',
  ontology: 'bg-zinc-700 border border-zinc-600 text-zinc-500 text-xs px-2 py-0.5 rounded no-scanline',
  entity:   'bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs px-2 py-0.5 rounded no-scanline',
}

const pillInlineStyle = 'position: relative; z-index: 10001;'

export function Pill({ children, variant = 'default' }: { children: Child; variant?: PillVariant }) {
  return <span class={pillStyles[variant]} style={pillInlineStyle}>{children}</span>
}

type TagLinkVariant = 'card' | 'page'

const tagLinkStyles: Record<TagLinkVariant, string> = {
  card: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 rounded transition-colors no-scanline',
  page: 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs px-2 py-1 rounded transition-colors no-scanline',
}

export function TagLink({ tag, href, variant = 'card' }: { tag: string; href: string; variant?: TagLinkVariant }) {
  return (
    <a href={href} class={tagLinkStyles[variant]} style={pillInlineStyle}>#{tag}</a>
  )
}

export function TagFilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      class={`text-xs px-2.5 py-1 rounded border transition-colors no-scanline ${
        active
          ? 'bg-red-900/30 border-red-700 text-red-400'
          : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
      }`}
      style={pillInlineStyle}
    >
      {label}
    </a>
  )
}
