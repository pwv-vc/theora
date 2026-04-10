/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../../lib/wiki.js'
import { DocumentIcon, LightbulbIcon, SearchIcon } from './icons/index.js'

interface WikiHeaderProps {
  kbName: string
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  activeSection?: 'sources' | 'concepts' | 'queries'
}

export function WikiHeader({ kbName, sources, concepts, queries, activeSection }: WikiHeaderProps) {
  return (
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-zinc-100 mb-1 py-2">{kbName}</h1>
      <div class="flex flex-wrap gap-2">
        <a href="/" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'sources' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <DocumentIcon size={14} />
          <span>{sources.length} sources</span>
        </a>
        <a href="/wiki/concepts" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'concepts' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <LightbulbIcon size={14} />
          <span>{concepts.length} concepts</span>
        </a>
        <a href="/wiki/queries" class={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors no-scanline ${activeSection === 'queries' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-600'}`}>
          <SearchIcon size={14} />
          <span>{queries.length} queries</span>
        </a>
      </div>
    </div>
  )
}
