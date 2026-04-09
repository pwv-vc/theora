/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'
import type { WikiArticle } from '../../lib/wiki.js'

export type ArticleKind = 'sources' | 'concepts' | 'output'

export function getArticleKind(article: WikiArticle): ArticleKind {
  if (article.relativePath.startsWith('wiki/concepts/')) return 'concepts'
  if (article.relativePath.startsWith('output/')) return 'output'
  return 'sources'
}

export function getArticleHref(article: WikiArticle): string {
  const slug = article.path.split('/').pop()?.replace('.md', '') ?? ''
  const kind = getArticleKind(article)

  if (kind === 'output') return `/output/${slug}`
  return `/wiki/${kind}/${slug}`
}

export function getArticleLabel(article: WikiArticle): string {
  const kind = getArticleKind(article)
  if (kind === 'output') return 'answer'
  if (kind === 'concepts') return 'concept'
  return 'source'
}

export function BroadcastWordmark() {
  return (
    <svg
      viewBox="0 0 220 54"
      aria-hidden="true"
      class="h-8 w-auto sm:h-9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 10H52V18H35V44H23V18H6V10Z" fill="var(--accent-primary)" />
      <path d="M56 10H88L95 17V44H83V34H68V44H56V10ZM68 18V26H83V18H68Z" fill="var(--text-primary)" />
      <path d="M101 10H138L145 17V44H101V10ZM113 18V36H133V18H113Z" fill="var(--accent-secondary)" />
      <path d="M150 10H162L180 31V10H192V44H181L162 22V44H150V10Z" fill="var(--text-primary)" />
      <path d="M196 10H214L206 27L214 44H201L194 31H192V44H180V10H192V23H194L201 10H196Z" fill="var(--accent-warning)" />
      <path d="M18 6H85" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="square" />
      <path d="M100 48H166" stroke="var(--accent-secondary)" stroke-width="2.5" stroke-linecap="square" />
    </svg>
  )
}

export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: Child
}) {
  return (
    <div class="flex items-center justify-between gap-3">
      <h2 class="console-subheading">{title}</h2>
      {action}
    </div>
  )
}

export function TagLink({
  tag,
  href,
  count,
  active = false,
}: {
  tag: string
  href: string
  count?: number
  active?: boolean
}) {
  return (
    <a
      href={href}
      class={active ? 'console-chip console-chip-active' : 'console-chip hover:text-[var(--text-primary)]'}
    >
      #{tag}
      {typeof count === 'number' && <span class="text-[var(--text-muted)]">{count}</span>}
    </a>
  )
}

interface TagPickerProps {
  allTags: string[]
  selectedTags: string[]
  pickerId: string
  label: string
  emptyLabel?: string
}

export function TagPicker({ allTags, selectedTags, pickerId, label, emptyLabel }: TagPickerProps) {
  return (
    <details
      class="tag-picker"
      data-tag-picker
      data-tag-root
      id={pickerId}
      open={selectedTags.length > 0}
    >
      <summary class="tag-picker__trigger" data-tag-trigger>
        <span>{label}</span>
        <span class="tag-picker__count" data-tag-count>
          {selectedTags.length > 0 ? `${selectedTags.length} active` : `${allTags.length} available`}
        </span>
        <span aria-hidden="true" class="tag-picker__icon">+</span>
      </summary>

      <div class="tag-picker__header">
        <div class="tag-picker__summary empty:hidden" data-selected-tags>
          {selectedTags.map(tag => (
            <button
              type="button"
              key={tag}
              class="console-chip console-chip-active"
              data-remove-tag={tag}
            >
              <span>#{tag}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          data-tag-clear
          hidden={selectedTags.length === 0}
        >
          clear
        </button>
      </div>

      <div class="tag-picker__tray">
        <div class="tag-picker__tray-inner">
          <input
            type="search"
            class="console-input"
            placeholder="Filter tags"
            data-tag-filter
          />
          <div class="tag-picker__options" data-tag-options>
            {allTags.length > 0 ? allTags.map(tag => (
              <label key={tag} class="tag-picker__option" data-tag-option={tag.toLowerCase()}>
                <span class="font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">#{tag}</span>
                <input type="checkbox" name="tag" value={tag} checked={selectedTags.includes(tag)} />
              </label>
            )) : (
              <div class="tag-picker__empty">{emptyLabel ?? 'No tags available yet'}</div>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}

interface ArticleCardProps {
  article: WikiArticle
  eyebrow?: string
  description?: string
}

export function ArticleCard({ article, eyebrow, description }: ArticleCardProps) {
  return (
    <a href={getArticleHref(article)} class="block">
      <article class="console-card-interactive article-card h-full">
        <div class="mb-3 flex items-center justify-between gap-3">
          <span class="console-muted">{eyebrow ?? getArticleLabel(article)}</span>
          <span class="text-xs text-[var(--text-muted)]">{article.tags.length} tag{article.tags.length === 1 ? '' : 's'}</span>
        </div>
        <h3 class="font-[var(--font-display)] text-lg font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">
          {article.title}
        </h3>
        {description && (
          <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        )}
        {article.tags.length > 0 && (
          <div class="mt-4 flex flex-wrap gap-2">
            {article.tags.slice(0, 4).map(tag => (
              <span key={tag} class="console-chip">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </a>
  )
}
