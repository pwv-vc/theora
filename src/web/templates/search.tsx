/** @jsxImportSource hono/jsx */
import type { SearchResult } from '../../lib/search.js'

interface SearchPageProps {
  q: string
  tag: string
  tags: string[]
}

interface SearchResultsProps {
  results: SearchResult[]
  q: string
}

export function SearchPage({ q, tag, tags }: SearchPageProps) {
  return (
    <div>
      <div class="mb-6">
        <h1 class="text-xl font-bold text-zinc-100 mb-4">Search</h1>
        <div class="flex gap-3">
          <input
            type="text"
            name="q"
            value={q}
            placeholder="Search the wiki..."
            autofocus
            class="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors"
            hx-get="/search/results"
            hx-trigger="input changed delay:300ms, keyup[key=='Enter']"
            hx-target="#results"
            hx-include="[name='tag']"
          />
          <input type="hidden" name="tag" value={tag} />
        </div>
      </div>

      {tags.length > 0 && (
        <div class="mb-6">
          <div class="text-zinc-600 text-xs uppercase tracking-wider mb-2">Filter by tag</div>
          <div class="flex flex-wrap gap-2">
            <a
              href="/search"
              class={`text-xs px-2.5 py-1 rounded border transition-colors ${
                !tag
                  ? 'bg-red-900/30 border-red-700 text-red-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              all
            </a>
            {tags.map(t => (
              <a
                key={t}
                href={`/search?tag=${encodeURIComponent(t)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                class={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  tag === t
                    ? 'bg-red-900/30 border-red-700 text-red-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                #{t}
              </a>
            ))}
          </div>
        </div>
      )}

      <div id="results">
        {q && <SearchResultsInner q={q} tag={tag} />}
      </div>
    </div>
  )
}

function SearchResultsInner({ q, tag }: { q: string; tag: string }) {
  return (
    <div
      hx-get={`/search/results?q=${encodeURIComponent(q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`}
      hx-trigger="load"
      hx-target="#results"
    />
  )
}

export function SearchResults({ results, q }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div class="text-zinc-600 text-sm py-4">
        No results for <span class="text-zinc-400">"{q}"</span>
      </div>
    )
  }

  return (
    <div class="space-y-3">
      <div class="text-zinc-600 text-xs mb-4">
        {results.length} result{results.length !== 1 ? 's' : ''} for "{q}"
      </div>
      {results.map(result => {
        const slug = result.path.split('/').pop()?.replace('.md', '') ?? ''
        const isOutput = result.relativePath.startsWith('output/')
        const isSource = result.relativePath.startsWith('wiki/sources/')
        const isConcept = result.relativePath.startsWith('wiki/concepts/')

        const href = isOutput
          ? `/output/${slug}`
          : isSource
          ? `/wiki/sources/${slug}`
          : isConcept
          ? `/wiki/concepts/${slug}`
          : '#'

        const typeLabel = isOutput ? 'query' : isSource ? 'source' : isConcept ? 'concept' : ''

        return (
          <a key={result.path} href={href} class="block group">
            <div class="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="text-zinc-100 text-sm font-medium group-hover:text-white">
                  {result.title}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  {typeLabel && (
                    <span class="text-zinc-600 text-xs">{typeLabel}</span>
                  )}
                  <span class="text-zinc-700 text-xs">{result.score}</span>
                </div>
              </div>
              {result.snippet && (
                <p class="text-zinc-500 text-xs leading-relaxed line-clamp-2">{result.snippet}</p>
              )}
              {result.tags.length > 0 && (
                <div class="flex flex-wrap gap-1 mt-2">
                  {result.tags.slice(0, 5).map(tag => (
                    <span key={tag} class="bg-zinc-800 text-zinc-500 text-xs px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </a>
        )
      })}
    </div>
  )
}
