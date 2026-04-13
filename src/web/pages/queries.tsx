/** @jsxImportSource hono/jsx */
import type { WikiArticle, TagWithCount } from '../../lib/wiki.js'
import { getKbName } from '../../lib/config.js'
import { EmptyState, Pagination, SectionHeader, TagFilterBar, WikiHeader, ArticleCard, SortBar } from './ui/index.js'
import type { SortOption } from '../../lib/wiki-nav.js'

interface QueriesPageProps {
  queries: WikiArticle[]
  sources: WikiArticle[]
  concepts: WikiArticle[]
  tagsWithCounts: TagWithCount[]
  activeTag: string
  activeSort: SortOption
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

function QueryCard({ article }: { article: WikiArticle }) {
  const slug = article.path.split('/').pop()?.replace('.md', '')
  const href = `/output/${slug}`

  return (
    <ArticleCard
      article={article}
      href={href}
      showSnippet={true}
      snippetLength={120}
      maxTags={4}
      showDate={true}
    />
  )
}

export function QueriesPage({ queries, sources, concepts, tagsWithCounts, activeTag, activeSort, config, pagination, totalCounts }: QueriesPageProps) {
  const kbName = getKbName(config)

  return (
    <div>
      <WikiHeader kbName={kbName} sources={sources} concepts={concepts} queries={queries} totalCounts={totalCounts} activeSection="queries" />

      <SectionHeader title="Queries" count={pagination.totalItems} />

      {tagsWithCounts.length > 0 && (
        <div class="mb-4">
          <TagFilterBar
            tagsWithCounts={tagsWithCounts}
            activeTag={activeTag}
            hrefBase="/wiki/queries"
            clearHref="/wiki/queries"
          />
        </div>
      )}

      <div class="mb-6">
        <SortBar
          activeSort={activeSort}
          hrefBase="/wiki/queries"
          activeTag={activeTag}
        />
      </div>

      {queries.length > 0 ? (
        <section class="mb-10">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {queries.map(a => <QueryCard key={a.path} article={a} />)}
          </div>

          {pagination.totalPages > 1 && (
            <div class="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                baseUrl="/wiki/queries"
                activeTag={activeTag}
                activeSort={activeSort}
              />
            </div>
          )}
        </section>
      ) : (
        <EmptyState>
          {activeTag ? (
            <p class="text-zinc-500 text-sm">No queries tagged <span class="text-zinc-300">#{activeTag}</span>.</p>
          ) : (
            <p class="text-zinc-500 text-sm">No queries yet. Use <a href="/ask" class="text-red-500 hover:text-red-400">ask</a> to generate answers that get filed back into the wiki.</p>
          )}
        </EmptyState>
      )}
    </div>
  )
}
