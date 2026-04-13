/** @jsxImportSource hono/jsx */

export type SortOption = 'alpha-asc' | 'alpha-desc' | 'date-newest' | 'date-oldest'

interface SortBarProps {
  activeSort: SortOption
  hrefBase: string
  activeTag?: string
  activeSourceType?: string
}

function buildSortUrl(
  baseUrl: string,
  sort: SortOption,
  activeTag?: string,
  activeSourceType?: string,
): string {
  const params = new URLSearchParams()
  params.set('sort', sort)
  if (activeTag) params.set('tag', activeTag)
  if (activeSourceType) params.set('sourceType', activeSourceType)
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function SortButton({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children: unknown
}) {
  const baseClasses =
    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap'
  const activeClasses =
    'bg-red-900/30 border-red-700 text-red-400'
  const inactiveClasses =
    'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'

  return (
    <a
      href={href}
      class={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {children}
    </a>
  )
}

function SortIcon({ sort }: { sort: SortOption }) {
  const icons = {
    'alpha-asc': (
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
    'alpha-desc': (
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h5m4 0l4 4m0 0l4-4m-4 4V4" />
      </svg>
    ),
    'date-newest': (
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    ),
    'date-oldest': (
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
    ),
  }

  return icons[sort] || icons['alpha-asc']
}

export function SortBar({
  activeSort,
  hrefBase,
  activeTag,
  activeSourceType,
}: SortBarProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'alpha-asc', label: 'A–Z' },
    { value: 'alpha-desc', label: 'Z–A' },
    { value: 'date-newest', label: 'Newest' },
    { value: 'date-oldest', label: 'Oldest' },
  ]

  return (
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-zinc-500">Sort:</span>
      {sortOptions.map(({ value, label }) => (
        <SortButton
          key={value}
          href={buildSortUrl(hrefBase, value, activeTag, activeSourceType)}
          active={activeSort === value}
        >
          <SortIcon sort={value} />
          <span>{label}</span>
        </SortButton>
      ))}
    </div>
  )
}
