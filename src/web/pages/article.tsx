/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'
import { Pill, Prose, TagLink } from './ui/index.js'

interface ArticlePageProps {
  article: WikiArticle
  html: string
}

export function ArticlePage({ article, html }: ArticlePageProps) {
  const fm = article.frontmatter
  const type = String(fm.type ?? '')
  const dateCompiled = String(fm.date_compiled ?? fm.date ?? '')
  const sourceFile = fm.source_file ? String(fm.source_file) : null
  const sourceThumbnailUrl = fm.source_thumbnail_url ? String(fm.source_thumbnail_url) : null
  const ontology = Array.isArray(fm.ontology) ? fm.ontology.map(String) : []
  const entities = fm.entities && typeof fm.entities === 'object' ? fm.entities as Record<string, string[]> : {}

  const typeLabel =
    type === 'source'
      ? 'source'
      : type === 'concept'
        ? 'concept'
        : type === 'query'
          ? 'query'
          : type === 'mind-map'
            ? 'mind map'
            : ''

  return (
    <div>
      <div class="mb-6">
        <a href="/" class="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
          ← back
        </a>
      </div>

      <div class="mb-6 pb-6 border-b border-zinc-800">
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          {typeLabel && <Pill variant="type">{typeLabel}</Pill>}
          {ontology.map(o => (
            <Pill key={o} variant="ontology">{o}</Pill>
          ))}
          {Object.entries(entities).flatMap(([entityType, names]) =>
            names.map(name => (
              <Pill key={`${entityType}-${name}`} variant="entity">{entityType}/{name}</Pill>
            ))
          )}
        </div>

        <h1 class="text-2xl font-bold text-zinc-100 mb-3">{article.title}</h1>

        <div class="flex flex-wrap items-center gap-3">
          {article.tags.length > 0 && (
            <div class="flex flex-wrap gap-1.5">
              {article.tags.map(tag => (
                <TagLink key={tag} tag={tag} href={`/search?tag=${encodeURIComponent(tag)}`} variant="card" />
              ))}
            </div>
          )}
          {dateCompiled && <span class="text-zinc-600 text-xs">{dateCompiled}</span>}
          {sourceFile && (
            <a
              href={`/raw/${sourceFile}`}
              target="_blank"
              rel="noopener noreferrer"
              class="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
              title="View raw source file"
            >
              from {sourceFile}
            </a>
          )}
        </div>
      </div>

      {sourceThumbnailUrl && (
        <div class="mb-8 bg-zinc-900 border border-zinc-800 rounded-lg p-3 no-scanline" style="position: relative; z-index: 10001;">
          <div class="aspect-video overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
            <img
              src={sourceThumbnailUrl}
              alt={`Thumbnail for ${article.title}`}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <Prose html={html} />
    </div>
  )
}
