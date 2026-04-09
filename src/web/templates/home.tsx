/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'

interface HomePageProps {
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  tags: string[]
  stats: Record<string, unknown> | null
  config: Record<string, unknown>
}

function ArticleCard({ article, type }: { article: WikiArticle; type: 'sources' | 'concepts' | 'output' }) {
  const href = type === 'output'
    ? `/output/${article.path.split('/').pop()?.replace('.md', '')}`
    : `/wiki/${type}/${article.path.split('/').pop()?.replace('.md', '')}`

  return (
    <a href={href} class="block group">
      <div class="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all">
        <div class="text-zinc-100 text-sm font-medium group-hover:text-white mb-1 truncate">
          {article.title}
        </div>
        {article.tags.length > 0 && (
          <div class="flex flex-wrap gap-1 mt-2">
            {article.tags.slice(0, 4).map(tag => (
              <span key={tag} class="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div class="border border-zinc-800 rounded-lg p-4">
      <div class="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div class="text-zinc-100 text-lg font-bold">{value}</div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: unknown }) {
  return (
    <section class="mb-10">
      <div class="flex items-center gap-3 mb-4">
        <h2 class="text-zinc-100 font-bold text-sm uppercase tracking-wider">{title}</h2>
        <span class="text-zinc-600 text-xs">{count}</span>
      </div>
      {children}
    </section>
  )
}

export function HomePage({ sources, concepts, queries, tags, stats, config }: HomePageProps) {
  const kbName = String(config.name ?? 'Knowledge Base')

  const formatCost = (usd: number) => usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
  const formatTokens = (n: number) => {
    if (n < 1000) return `${n}`
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
    return `${(n / 1_000_000).toFixed(2)}M`
  }

  return (
    <div>
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-zinc-100 mb-1">{kbName}</h1>
        <p class="text-zinc-500 text-sm">
          {sources.length} sources · {concepts.length} concepts · {queries.length} queries
        </p>
      </div>

      {stats && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard label="LLM Calls" value={Number(stats.totalLlmCalls ?? 0)} />
          <StatCard label="Tokens In" value={formatTokens(Number(stats.totalInputTokens ?? 0))} />
          <StatCard label="Tokens Out" value={formatTokens(Number(stats.totalOutputTokens ?? 0))} />
          <StatCard label="Est. Cost" value={formatCost(Number(stats.totalEstimatedCostUsd ?? 0))} />
        </div>
      )}

      {tags.length > 0 && (
        <div class="mb-8 flex flex-wrap gap-2">
          {tags.map(tag => (
            <a
              key={tag}
              href={`/search?tag=${encodeURIComponent(tag)}`}
              class="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs px-2 py-1 rounded transition-colors"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <Section title="Sources" count={sources.length}>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map(a => <ArticleCard key={a.path} article={a} type="sources" />)}
          </div>
        </Section>
      )}

      {concepts.length > 0 && (
        <Section title="Concepts" count={concepts.length}>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {concepts.map(a => <ArticleCard key={a.path} article={a} type="concepts" />)}
          </div>
        </Section>
      )}

      {queries.length > 0 && (
        <Section title="Previous Queries" count={queries.length}>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {queries.map(a => <ArticleCard key={a.path} article={a} type="output" />)}
          </div>
        </Section>
      )}

      {sources.length === 0 && concepts.length === 0 && (
        <div class="border border-zinc-800 rounded-lg p-8 text-center">
          <p class="text-zinc-500 text-sm mb-2">No articles compiled yet.</p>
          <p class="text-zinc-600 text-xs">
            Run <code class="text-zinc-400">theora ingest</code> then{' '}
            <a href="/compile" class="text-red-500 hover:text-red-400">compile</a> to get started.
          </p>
        </div>
      )}
    </div>
  )
}
