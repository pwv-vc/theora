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

// Entity pill with dual links: search (primary text) + mind map (secondary icon)
export function EntityPill({
  entityType,
  name,
  searchHref,
  mapHref
}: {
  entityType: string
  name: string
  searchHref: string
  mapHref: string
}) {
  return (
    <span class="inline-flex items-center gap-0.5">
      <a
        href={searchHref}
        class="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300 text-xs px-2 py-0.5 rounded transition-colors no-scanline"
        style={pillInlineStyle}
        title={`Search articles with entity "${entityType}/${name}"`}
      >
        {entityType}/{name}
      </a>
      <a
        href={mapHref}
        class="bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs px-1 py-0.5 rounded transition-colors no-scanline"
        style={pillInlineStyle}
        title={`View "${entityType}/${name}" in mind map`}
      >
        <MindMapIcon />
      </a>
    </span>
  )
}

export function Pill({
  children,
  variant = 'default',
  href
}: {
  children: Child
  variant?: PillVariant
  href?: string
}) {
  const baseClasses = pillStyles[variant]
  const hoverClasses = href ? ' hover:bg-zinc-700 hover:border-zinc-600 hover:text-zinc-300 transition-colors' : ''

  if (href) {
    return (
      <a href={href} class={baseClasses + hoverClasses} style={pillInlineStyle}>
        {children}
      </a>
    )
  }

  return <span class={baseClasses} style={pillInlineStyle}>{children}</span>
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

// Mind map icon (locate-fixed style - crosshairs with center point)
const MindMapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
)

// Tag with dual links: search (primary) + mind map (secondary icon)
export function TagWithMapLink({ 
  tag, 
  searchHref, 
  mapHref,
  variant = 'card' 
}: { 
  tag: string; 
  searchHref: string; 
  mapHref: string;
  variant?: TagLinkVariant 
}) {
  return (
    <span class="inline-flex items-center gap-0.5">
      <a href={searchHref} class={tagLinkStyles[variant]} style={pillInlineStyle}>#{tag}</a>
      <a 
        href={mapHref} 
        class="bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs px-1 py-0.5 rounded transition-colors no-scanline"
        style={pillInlineStyle}
        title={`View "${tag}" in mind map`}
      >
        <MindMapIcon />
      </a>
    </span>
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
