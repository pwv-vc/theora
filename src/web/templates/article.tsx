/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'

interface ArticlePageProps {
  article: WikiArticle
  html: string
}

export function ArticlePage({ article, html }: ArticlePageProps) {
  const fm = article.frontmatter
  const type = String(fm.type ?? '')
  const dateCompiled = String(fm.date_compiled ?? fm.date ?? '')
  const sourceFile = fm.source_file ? String(fm.source_file) : null
  const ontology = Array.isArray(fm.ontology) ? fm.ontology.map(String) : []

  const backHref = type === 'query' ? '/' : type === 'concept' ? '/' : '/'
  const typeLabel = type === 'source' ? 'source' : type === 'concept' ? 'concept' : type === 'query' ? 'query' : ''

  return (
    <div>
      <div class="mb-6">
        <a href={backHref} class="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
          ← back
        </a>
      </div>

      <div class="mb-6 pb-6 border-b border-zinc-800">
        <div class="flex items-center gap-2 mb-3">
          {typeLabel && (
            <span class="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded uppercase tracking-wider">
              {typeLabel}
            </span>
          )}
          {ontology.map(o => (
            <span key={o} class="bg-zinc-900 border border-zinc-700 text-zinc-500 text-xs px-2 py-0.5 rounded">
              {o}
            </span>
          ))}
        </div>

        <h1 class="text-2xl font-bold text-zinc-100 mb-3">{article.title}</h1>

        <div class="flex flex-wrap items-center gap-3">
          {article.tags.length > 0 && (
            <div class="flex flex-wrap gap-1.5">
              {article.tags.map(tag => (
                <a
                  key={tag}
                  href={`/search?tag=${encodeURIComponent(tag)}`}
                  class="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5 rounded transition-colors"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}
          {dateCompiled && (
            <span class="text-zinc-600 text-xs">{dateCompiled}</span>
          )}
          {sourceFile && (
            <span class="text-zinc-600 text-xs">from {sourceFile}</span>
          )}
        </div>
      </div>

      <div
        class="prose prose-invert prose-zinc max-w-none prose-headings:font-mono prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-red-400 prose-a:no-underline hover:prose-a:text-red-300 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-strong:text-zinc-100 prose-li:text-zinc-300 prose-blockquote:border-red-800 prose-blockquote:text-zinc-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
