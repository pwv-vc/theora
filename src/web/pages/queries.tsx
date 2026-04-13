/** @jsxImportSource hono/jsx */
import type { WikiArticle, TagWithCount } from '../../lib/wiki.js'
import { Card, EmptyState, Pill, SectionHeader, TagFilterBar, WikiHeader } from './ui/index.js'

interface QueriesPageProps {
  queries: WikiArticle[]
  sources: WikiArticle[]
  concepts: WikiArticle[]
  tagsWithCounts: TagWithCount[]
  activeTag: string
  config: Record<string, unknown>
}

function QueryCard({ article }: { article: WikiArticle }) {
  const slug = article.path.split('/').pop()?.replace('.md', '')
  const href = `/output/${slug}`

  return (
    <Card href={href}>
      <div class="text-zinc-100 text-sm font-bold group-hover:text-red-500 mb-1 truncate">
        {article.title}
      </div>
      {article.tags.length > 0 && (
        <div class="flex flex-wrap gap-1 mt-2">
          {article.tags.slice(0, 4).map(tag => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      )}
    </Card>
  )
}

export function QueriesPage({ queries, sources, concepts, tagsWithCounts, activeTag, config }: QueriesPageProps) {
  const kbName = String(config.name ?? 'Knowledge Base')

  return (
    <div>
      <WikiHeader kbName={kbName} sources={sources} concepts={concepts} queries={queries} activeSection="queries" />

      <SectionHeader title="Queries" count={queries.length} />

      {tagsWithCounts.length > 0 && (
        <div class="mb-8">
          <TagFilterBar
            tagsWithCounts={tagsWithCounts}
            activeTag={activeTag}
            hrefBase="/wiki/queries"
            clearHref="/wiki/queries"
          />
        </div>
      )}

      {queries.length > 0 ? (
        <section class="mb-10">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {queries.map(a => <QueryCard key={a.path} article={a} />)}
          </div>
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
