/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'
import { getArticleLabel, TagLink } from './ui.js'

interface ArticlePageProps {
  article: WikiArticle
  html: string
}

export function ArticlePage({ article, html }: ArticlePageProps) {
  const fm = article.frontmatter
  const type = String(fm.type ?? '')
  const dateCompiled = String(fm.date_compiled ?? fm.date ?? '')
  const sourceFile = fm.source_file ? String(fm.source_file) : null
  const sourceType = fm.source_type ? String(fm.source_type) : null
  const ontology = Array.isArray(fm.ontology) ? fm.ontology.map(String) : []
  const relatedSources = Array.isArray(fm.related_sources) ? fm.related_sources.map(String) : []

  const backHref = article.tags[0]
    ? `/search?tag=${encodeURIComponent(article.tags[0])}`
    : type === 'query'
    ? '/ask'
    : '/search'
  const typeLabel = getArticleLabel(article)
  const askHref = article.tags.length > 0
    ? `/ask?${article.tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&')}`
    : '/ask'
  const searchHref = article.tags.length > 0
    ? `/search?${article.tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&')}`
    : '/search'

  return (
    <div class="page-stack">
      <a href={backHref} class="console-chip hover:text-[var(--text-primary)]">
        Back to search
      </a>

      <section class="article-header">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="console-chip console-chip-active">{typeLabel}</span>
            {ontology.map(item => (
              <span key={item} class="console-chip">{item}</span>
            ))}
            {sourceType && <span class="console-chip">{sourceType}</span>}
          </div>

          <div class="space-y-3">
            <h1 class="console-heading">{article.title}</h1>
            <div class="article-meta">
              {dateCompiled && <span>Compiled {dateCompiled}</span>}
              {sourceFile && <span>{sourceFile}</span>}
              <span>{article.tags.length} tag{article.tags.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {article.tags.length > 0 && (
            <div class="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <TagLink key={tag} tag={tag} href={`/search?tag=${encodeURIComponent(tag)}`} />
              ))}
            </div>
          )}

          <div class="flex flex-wrap gap-3">
            <a href={searchHref} class="console-button-secondary">Search related</a>
            <a href={askHref} class="console-chip hover:text-[var(--text-primary)]">Ask with these tags</a>
          </div>

          {relatedSources.length > 0 && (
            <div class="inline-pivots">
              <span class="console-muted">Related</span>
              <div class="flex flex-wrap gap-2">
                {relatedSources.slice(0, 4).map(source => (
                  <a
                    key={source}
                    href={`/search?q=${encodeURIComponent(source.replaceAll('[[', '').replaceAll(']]', ''))}`}
                    class="console-chip hover:text-[var(--text-primary)]"
                  >
                    {source}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        class="console-card prose prose-theora article-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
