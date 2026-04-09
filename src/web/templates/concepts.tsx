/** @jsxImportSource hono/jsx */
import type { WikiArticle, TagWithCount } from '../../lib/wiki.js'
import { Card, EmptyState, Pill, SectionHeader, TagFilterBar } from './ui/index.js'

interface ConceptsPageProps {
  concepts: WikiArticle[]
  tagsWithCounts: TagWithCount[]
  activeTag: string
}

function ConceptCard({ article }: { article: WikiArticle }) {
  const slug = article.path.split('/').pop()?.replace('.md', '')
  const href = `/wiki/concepts/${slug}`

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

export function ConceptsPage({ concepts, tagsWithCounts, activeTag }: ConceptsPageProps) {
  return (
    <div>
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-zinc-100 mb-1">Concepts</h1>
        <p class="text-zinc-500 text-sm">Key ideas extracted across all sources</p>
      </div>

      {tagsWithCounts.length > 0 && (
        <div class="mb-8">
          <TagFilterBar
            tagsWithCounts={tagsWithCounts}
            activeTag={activeTag}
            hrefBase="/wiki/concepts"
            clearHref="/wiki/concepts"
          />
        </div>
      )}

      {concepts.length > 0 ? (
        <section class="mb-10">
          <SectionHeader title="Concepts" count={concepts.length} />
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {concepts.map(a => <ConceptCard key={a.path} article={a} />)}
          </div>
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
