/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../../lib/wiki.js'
import { DocumentIcon, LightbulbIcon, SearchIcon } from './icons/index.js'

interface WikiHeaderProps {
  kbName: string
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  /** Total counts for display (when paginated arrays are passed) */
  totalCounts?: {
    sources: number
    concepts: number
    queries: number
  }
  /** When omitted, no wiki subsection pill is highlighted. */
  activeSection?: 'sources' | 'concepts' | 'queries'
}

export function WikiHeader({ kbName, sources, concepts, queries, totalCounts, activeSection }: WikiHeaderProps) {
  const sourceCount = totalCounts?.sources ?? sources.length
  const conceptCount = totalCounts?.concepts ?? concepts.length
  const queryCount = totalCounts?.queries ?? queries.length

  return (
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-zinc-100 mb-1 py-2">{kbName}</h1>
      <div class="flex flex-wrap gap-2">
        <a href="/" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'sources' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <DocumentIcon size={14} />
          <span>{sourceCount} sources</span>
        </a>
        <a href="/wiki/concepts" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'concepts' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <LightbulbIcon size={14} />
          <span>{conceptCount} concepts</span>
        </a>
        <a href="/wiki/queries" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'queries' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <SearchIcon size={14} />
          <span>{queryCount} queries</span>
        </a>
      </div>
    </div>
  )
}
