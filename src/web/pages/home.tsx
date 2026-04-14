/** @jsxImportSource hono/jsx */
import type { WikiArticle, TagWithCount } from '../../lib/wiki.js'
import { getKbName } from '../../lib/config.js'
import { Card, EmptyState, Pagination, SectionHeader, StatCard, TagFilterBar, WikiHeader, SourceTypeFilterBar, ArticleCard, SortBar } from './ui/index.js'
import type { SortOption } from '../../lib/wiki-nav.js'

interface HomePageProps {
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  tagsWithCounts: TagWithCount[]
  sourceTypesWithCounts: { type: string; count: number }[]
  activeTag: string
  activeSourceType: string
  activeSort: SortOption
  stats: Record<string, unknown> | null
  config: Record<string, unknown>
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
  totalCounts: {
    sources: number
    concepts: number
    queries: number
  }
}

function SourceArticleCard({ article }: { article: WikiArticle }) {
  const slug = article.path.split('/').pop()?.replace('.md', '')
  const href = `/wiki/sources/${slug}`
  const sourceType = article.frontmatter.source_type ? String(article.frontmatter.source_type) as 'text' | 'data' | 'pdf' | 'docx' | 'image' | 'audio' | 'video' | 'youtube' : null

  return (
    <ArticleCard
      article={article}
      href={href}
      sourceType={sourceType}
      showSnippet={true}
      snippetLength={120}
      maxTags={4}
    />
  )
}

function BrowseCard({ href, label, count, description }: { href: string; label: string; count: number; description: string }) {
  return (
    <a href={href} class="block group">
      <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800 transition-all no-scanline flex items-center justify-between" style="position: relative; z-index: 10001;">
        <div>
          <div class="text-zinc-100 text-sm font-bold group-hover:text-red-500 mb-0.5">{label}</div>
          <div class="text-zinc-500 text-xs">{description}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-zinc-600 text-sm">{count}</span>
          <svg class="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  )
}

export function HomePage({ sources, concepts, queries, tagsWithCounts, sourceTypesWithCounts, activeTag, activeSourceType, activeSort, stats, config, pagination, totalCounts }: HomePageProps) {
  const kbName = getKbName(config)

  const formatCost = (usd: number) => usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
  const formatTokens = (n: number) => {
    if (n < 1000) return `${n}`
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
    return `${(n / 1_000_000).toFixed(2)}M`
  }

  return (
    <div>
      <WikiHeader kbName={kbName} sources={sources} concepts={concepts} queries={queries} totalCounts={totalCounts} activeSection="sources" />

      {stats && !activeTag && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard label="LLM Calls" value={Number(stats.totalLlmCalls ?? 0)} />
          <StatCard label="Tokens In" value={formatTokens(Number(stats.totalInputTokens ?? 0))} />
          <StatCard label="Tokens Out" value={formatTokens(Number(stats.totalOutputTokens ?? 0))} />
          <StatCard label="Est. Cost" value={formatCost(Number(stats.totalEstimatedCostUsd ?? 0))} />
        </div>
      )}

      {sources.length > 0 ? (
        <section class="mb-10">
          <SectionHeader title="Sources" count={pagination.totalItems} />

          {tagsWithCounts.length > 0 && (
            <div class="mb-4">
              <TagFilterBar
                tagsWithCounts={tagsWithCounts}
                activeTag={activeTag}
                hrefBase="/"
                clearHref="/"
              />
            </div>
          )}

          {sourceTypesWithCounts.length > 0 && (
            <div class="mb-4">
              <SourceTypeFilterBar
                sourceTypesWithCounts={sourceTypesWithCounts}
                activeSourceType={activeSourceType}
                activeTag={activeTag}
              />
            </div>
          )}

          <div class="mb-6">
            <SortBar
              activeSort={activeSort}
              hrefBase="/"
              activeTag={activeTag}
              activeSourceType={activeSourceType}
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map(a => <SourceArticleCard key={a.path} article={a} />)}
          </div>

          {pagination.totalPages > 1 && (
            <div class="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                baseUrl="/"
                activeTag={activeTag}
                activeSourceType={activeSourceType}
                activeSort={activeSort}
              />
            </div>
          )}
        </section>
      ) : (
        <EmptyState>
          {activeTag || activeSourceType ? (
            <>
              <p class="text-zinc-500 text-sm mb-3">
                No sources found
                {activeTag && <span> tagged <span class="text-zinc-300">#{activeTag}</span></span>}
                {activeSourceType && <span>{activeTag ? ' and' : ''} of type <span class="text-zinc-300">{activeSourceType}</span></span>}.
              </p>
              <a href="/" class="text-red-500 hover:text-red-400 text-sm">← Back to all</a>
            </>
          ) : (
            <>
              <p class="text-zinc-500 text-sm mb-2">No sources compiled yet.</p>
              <p class="text-zinc-600 text-xs">
                Run <code class="text-zinc-400">theora ingest</code> then{' '}
                <a href="/compile" class="text-red-500 hover:text-red-400">compile</a> to get started.
              </p>
            </>
          )}
        </EmptyState>
      )}

      {!activeTag && (concepts.length > 0 || queries.length > 0) && (
        <section class="mb-10">
          <SectionHeader title="Browse" count={concepts.length + queries.length} />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {concepts.length > 0 && (
              <BrowseCard
                href="/wiki/concepts"
                label="Concepts"
                count={concepts.length}
                description="Key ideas extracted across all sources"
              />
            )}
            {queries.length > 0 && (
              <BrowseCard
                href="/wiki/queries"
                label="Queries"
                count={queries.length}
                description="Previous answers filed back into the wiki"
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}
