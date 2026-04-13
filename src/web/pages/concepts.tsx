/** @jsxImportSource hono/jsx */
import type { WikiArticle, TagWithCount } from '../../lib/wiki.js'
import { getKbName } from '../../lib/config.js'
import { EmptyState, Pagination, SectionHeader, TagFilterBar, WikiHeader, ArticleCard, SortBar } from './ui/index.js'
import type { SortOption } from '../../lib/wiki-nav.js'

interface ConceptsPageProps {
  concepts: WikiArticle[]
  sources: WikiArticle[]
  queries: WikiArticle[]
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

function ConceptCard({ article }: { article: WikiArticle }) {
  const slug = article.path.split('/').pop()?.replace('.md', '')
  const href = `/wiki/concepts/${slug}`

  return (
    <ArticleCard
      article={article}
      href={href}
      showSnippet={true}
      snippetLength={120}
      maxTags={4}
    />
  )
}

export function ConceptsPage({ concepts, sources, queries, tagsWithCounts, activeTag, activeSort, config, pagination, totalCounts }: ConceptsPageProps) {
  const kbName = getKbName(config)

  return (
    <div>
      <WikiHeader kbName={kbName} sources={sources} concepts={concepts} queries={queries} totalCounts={totalCounts} activeSection="concepts" />

      <SectionHeader title="Concepts" count={pagination.totalItems} />

      {tagsWithCounts.length > 0 && (
        <div class="mb-4">
          <TagFilterBar
            tagsWithCounts={tagsWithCounts}
            activeTag={activeTag}
            hrefBase="/wiki/concepts"
            clearHref="/wiki/concepts"
          />
        </div>
      )}

      <div class="mb-6">
        <SortBar
          activeSort={activeSort}
          hrefBase="/wiki/concepts"
          activeTag={activeTag}
        />
      </div>

      {concepts.length > 0 ? (
        <section class="mb-10">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {concepts.map(a => <ConceptCard key={a.path} article={a} />)}
          </div>

          {pagination.totalPages > 1 && (
            <div class="mt-8">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                baseUrl="/wiki/concepts"
                activeTag={activeTag}
                activeSort={activeSort}
              />
            </div>
          )}
        </section>
      ) : (
        <EmptyState>
          {activeTag ? (
            <p class="text-zinc-500 text-sm">No concepts tagged <span class="text-zinc-300">#{activeTag}</span>.</p>
          ) : (
            <p class="text-zinc-500 text-sm">No concepts compiled yet. Run <code class="text-zinc-400">theora compile</code> to extract concepts.</p>
          )}
        </EmptyState>
      )}
    </div>
  )
}
