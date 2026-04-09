/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'
import { ArticleCard, SectionHeading, TagLink } from './ui.js'

interface HomePageProps {
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  tags: string[]
  stats: Record<string, unknown> | null
  config: Record<string, unknown>
}

function BrowseSection({
  title,
  href,
  articles,
  eyebrow,
}: {
  title: string
  href: string
  articles: WikiArticle[]
  eyebrow: string
}) {
  if (articles.length === 0) return null

  return (
    <section class="space-y-4">
      <SectionHeading
        title={title}
        action={<a href={href} class="console-chip hover:text-[var(--text-primary)]">open</a>}
      />
      <div class="content-grid">
        {articles.map(article => <ArticleCard key={article.path} article={article} eyebrow={eyebrow} />)}
      </div>
    </section>
  )
}

export function HomePage({ sources, concepts, queries, tags, stats: _stats, config }: HomePageProps) {
  const kbName = String(config.name ?? 'Knowledge Base')
  const allArticles = [...sources, ...concepts, ...queries]
  const tagCounts = new Map<string, number>()

  for (const article of allArticles) {
    for (const tag of article.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)

  const isEmpty = allArticles.length === 0

  return (
    <div class="page-stack">
      <section class="hero-strip">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="console-chip console-chip-active">living wiki</span>
            <span class="console-chip">{tags.length} tags</span>
          </div>
          <div class="space-y-2">
            <h1 class="console-heading">{kbName}</h1>
            <p class="max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Search compiled sources, follow concepts, and file answers back into the knowledge base.
            </p>
          </div>
          <form method="get" action="/search" class="search-row">
            <input
              type="search"
              name="q"
              placeholder="Search the knowledge base"
              autofocus
              class="console-input search-row__input"
            />
            <button type="submit" class="console-button">Search</button>
            <a href="/ask" class="console-button-secondary">Ask</a>
          </form>
          {topTags.length > 0 && (
            <div class="inline-pivots">
              <span class="console-muted">Start with</span>
              <div class="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <TagLink key={tag} tag={tag} count={count} href={`/search?tag=${encodeURIComponent(tag)}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {isEmpty ? (
        <section class="console-card">
          <h2 class="console-subheading">No compiled content yet</h2>
          <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Bring in sources with <code>theora ingest</code>, then <a href="/compile" class="text-[var(--accent-secondary)]">compile</a> the wiki.
          </p>
        </section>
      ) : (
        <div class="page-stack">
          <BrowseSection title="Recent sources" href="/search" articles={sources.slice(0, 6)} eyebrow="source" />
          <BrowseSection title="Concepts" href="/search" articles={concepts.slice(0, 6)} eyebrow="concept" />
          <BrowseSection title="Answers" href="/ask" articles={queries.slice(0, 4)} eyebrow="answer" />
        </div>
      )}
    </div>
  )
}
