/** @jsxImportSource hono/jsx */
import type { SearchResult } from '../../lib/search.js'
import type { WikiArticle } from '../../lib/wiki.js'
import { ArticleCard, SectionHeading, TagLink, TagPicker } from './ui.js'

interface SearchPageProps {
  q: string
  selectedTags: string[]
  tags: string[]
  results: SearchResult[]
  discovery: {
    recent: WikiArticle[]
    concepts: WikiArticle[]
    suggestedTags: Array<{ tag: string; count: number }>
  }
}

export function SearchPage({ q, selectedTags, tags, results, discovery }: SearchPageProps) {
  const hasQuery = q.trim().length > 0
  const hasFilters = selectedTags.length > 0
  const askHref = selectedTags.length > 0
    ? `/ask?${selectedTags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&')}`
    : '/ask'

  return (
    <div class="page-stack">
      <section class="page-stack">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="console-chip console-chip-active">Search</span>
            <span class="console-chip">sources, concepts, answers</span>
          </div>
          <p class="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Search the living wiki, narrow by tags when you need to, and move into Ask with the same context.
          </p>
        </div>

        <form method="get" action="/search" class="search-panel" id="search-form">
          <div class="search-row">
            <input
              type="search"
              name="q"
              value={q}
              placeholder="Search the knowledge base"
              autofocus
              class="console-input search-row__input"
            />
            <button type="submit" class="console-button">Search</button>
            <a href={askHref} class="console-button-secondary">Ask</a>
          </div>

          <TagPicker
            allTags={tags}
            selectedTags={selectedTags}
            pickerId="search-tag-picker"
            label="Filters"
            emptyLabel="No tags are available yet"
          />

          {discovery.suggestedTags.length > 0 && (
            <div class="inline-pivots">
              <span class="console-muted">Suggested</span>
              <div class="flex flex-wrap gap-2">
                {discovery.suggestedTags.slice(0, 8).map(({ tag, count }) => (
                  <TagLink
                    key={tag}
                    tag={tag}
                    count={count}
                    href={`/search?tag=${encodeURIComponent(tag)}`}
                    active={selectedTags.includes(tag)}
                  />
                ))}
              </div>
            </div>
          )}
        </form>
      </section>

      {hasQuery || hasFilters ? (
        <SearchResults results={results} q={q} selectedTags={selectedTags} />
      ) : (
        <SearchDiscovery recent={discovery.recent} concepts={discovery.concepts} suggestedTags={discovery.suggestedTags} />
      )}
    </div>
  )
}

function SearchDiscovery({
  recent,
  concepts,
  suggestedTags,
}: {
  recent: WikiArticle[]
  concepts: WikiArticle[]
  suggestedTags: Array<{ tag: string; count: number }>
}) {
  return (
    <div class="page-stack">
      <section class="space-y-4">
        <SectionHeading title="Recent sources" />
        <div class="content-grid">
          {recent.slice(0, 6).map(article => <ArticleCard key={article.path} article={article} eyebrow="source" />)}
        </div>
      </section>

      <section class="space-y-4">
        <SectionHeading title="Concepts" />
        <div class="content-grid">
          {concepts.slice(0, 6).map(article => <ArticleCard key={article.path} article={article} eyebrow="concept" />)}
        </div>
      </section>

      {suggestedTags.length > 0 && (
        <section class="console-card space-y-3">
          <SectionHeading title="Common tags" />
          <div class="flex flex-wrap gap-2">
            {suggestedTags.slice(0, 12).map(({ tag, count }) => (
              <TagLink key={tag} tag={tag} count={count} href={`/search?tag=${encodeURIComponent(tag)}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function SearchResults({
  results,
  q,
  selectedTags,
}: {
  results: SearchResult[]
  q: string
  selectedTags: string[]
}) {
  if (results.length === 0) {
    return (
      <section class="console-card space-y-4">
        <div class="space-y-2">
          <h2 class="console-subheading">No matches</h2>
          <p class="text-sm leading-6 text-[var(--text-secondary)]">
            Try a broader query, remove a tag, or clear filters to return to recent sources and concepts.
          </p>
        </div>
        {selectedTags.length > 0 && (
          <div class="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <TagLink key={tag} tag={tag} href={`/search?q=${encodeURIComponent(q)}`} />
            ))}
          </div>
        )}
        <div class="flex flex-wrap gap-3">
          <a href="/search" class="console-chip hover:text-[var(--text-primary)]">Clear filters</a>
          <a href="/ask" class="console-chip hover:text-[var(--text-primary)]">Ask without filters</a>
        </div>
      </section>
    )
  }

  return (
    <section class="page-stack">
      <div class="result-summary">
        <div class="space-y-1">
          <div class="console-muted">Results</div>
          <p class="text-sm leading-6 text-[var(--text-secondary)]">
            {results.length} result{results.length === 1 ? '' : 's'}
            {q ? ` for "${q}"` : ''}
          </p>
        </div>
        {selectedTags.length > 0 && (
          <div class="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <TagLink
                key={tag}
                tag={tag}
                href={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
              />
            ))}
          </div>
        )}
      </div>

      <div class="space-y-3">
        {results.map(result => {
          const href = result.href

          return (
            <a key={result.path} href={href} class="block">
              <article class="console-card-interactive search-result-card">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="console-chip console-chip-active">{result.typeLabel}</span>
                  {result.matchedTags.map(tag => (
                    <span key={tag} class="console-chip">#{tag}</span>
                  ))}
                </div>
                <h2 class="mt-4 font-[var(--font-display)] text-xl font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">
                  {result.title}
                </h2>
                <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{result.snippet}</p>
                {result.matchReasons.length > 0 && (
                  <div class="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {result.matchReasons.map(reason => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                )}
              </article>
            </a>
          )
        })}
      </div>
    </section>
  )
}
