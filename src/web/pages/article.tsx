/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../lib/wiki.js'
import { Pill, Prose, TagWithMapLink, EntityPill, SourceTypeIcon } from './ui/index.js'

interface ArticlePageProps {
  article: WikiArticle
  html: string
}

export function ArticlePage({ article, html }: ArticlePageProps) {
  const slug = article.slug || article.path.split('/').pop()?.replace('.md', '') || ''
  const fm = article.frontmatter
  const type = String(fm.type ?? '')
  const dateCompiled = String(fm.date_compiled ?? fm.date ?? '')
  const sourceFile = fm.source_file ? String(fm.source_file) : null
  const sourceThumbnailUrl = fm.source_thumbnail_url ? String(fm.source_thumbnail_url) : null
  const sourceType = fm.source_type ? String(fm.source_type) as 'text' | 'data' | 'pdf' | 'docx' | 'image' | 'audio' | 'video' | 'youtube' : null
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
        <div class="flex items-start justify-between gap-4 mb-4">
          <h1 class="text-2xl font-bold text-zinc-100">{article.title}</h1>
          <a
            href={`/wiki/map?around=${encodeURIComponent(slug)}`}
            class="shrink-0 inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 text-xs px-3 py-1.5 rounded transition-colors border border-zinc-700 hover:border-zinc-600"
            title={`View "${article.title}" in the mind map`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
            View in Mind Map
          </a>
        </div>

        <div class="flex items-center gap-2 mb-3 flex-wrap">
          {typeLabel && <Pill variant="type">{typeLabel}</Pill>}
          {sourceType && (
            <Pill variant="type">
              <span class="flex items-center gap-1">
                <SourceTypeIcon type={sourceType} size={12} />
                <span class="capitalize">{sourceType}</span>
              </span>
            </Pill>
          )}
          {ontology.map(o => (
            <Pill key={o} variant="ontology">{o}</Pill>
          ))}
          {Object.entries(entities).flatMap(([entityType, names]) =>
            names.map(name => (
              <EntityPill
                key={`${entityType}-${name}`}
                entityType={entityType}
                name={name}
                searchHref={`/search?entity=${encodeURIComponent(`${entityType}/${name}`)}`}
                mapHref={`/wiki/map?entity=${encodeURIComponent(entityType)}:${encodeURIComponent(name)}`}
              />
            ))
          )}
        </div>

        <div class="flex flex-wrap items-center gap-3">
          {article.tags.length > 0 && (
            <div class="flex flex-wrap gap-1.5">
              {article.tags.map(tag => (
                <TagWithMapLink
                  key={tag}
                  tag={tag}
                  searchHref={`/search?tag=${encodeURIComponent(tag)}`}
                  mapHref={`/wiki/map?tag=${encodeURIComponent(tag)}`}
                  variant="card"
                />
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
