/** @jsxImportSource hono/jsx */
import { SourceTypeIcon } from './icons/index.js'

interface SourceTypeFilterBarProps {
  sourceTypesWithCounts: { type: string; count: number }[]
  activeSourceType: string
  activeTag: string
}

const typeLabels: Record<string, string> = {
  text: 'Text',
  data: 'Data',
  pdf: 'PDF',
  docx: 'Word',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  youtube: 'YouTube',
}

export function SourceTypeFilterBar({
  sourceTypesWithCounts,
  activeSourceType,
  activeTag,
}: SourceTypeFilterBarProps) {
  if (sourceTypesWithCounts.length === 0) return null

  const buildHref = (type: string) => {
    const params = new URLSearchParams()
    if (type) params.set('sourceType', type)
    if (activeTag) params.set('tag', activeTag)
    return `/?${params.toString()}`
  }

  const clearHref = activeTag ? `/?tag=${encodeURIComponent(activeTag)}` : '/'

  return (
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-zinc-500 text-xs mr-1">Type:</span>
      <a
        href={clearHref}
        class={`text-xs px-2.5 py-1 rounded border transition-colors no-scanline ${
          !activeSourceType
            ? 'bg-red-900/30 border-red-700 text-red-400'
            : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
        }`}
        style="position: relative; z-index: 10001;"
      >
        all
      </a>
      {sourceTypesWithCounts.map(({ type, count }) => (
        <a
          key={type}
          href={buildHref(type)}
          class={`text-xs px-2.5 py-1 rounded border transition-colors no-scanline inline-flex items-center gap-1.5 ${
            activeSourceType === type
              ? 'bg-red-900/30 border-red-700 text-red-400'
              : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          }`}
          style="position: relative; z-index: 10001;"
        >
          <SourceTypeIcon type={type as any} size={12} />
          <span>{typeLabels[type] || type}</span>
          <span class="text-zinc-600">{count}</span>
        </a>
      ))}
    </div>
  )
}
