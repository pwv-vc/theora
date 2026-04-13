/** @jsxImportSource hono/jsx */
import type { WikiArticle } from '../../../lib/wiki.js'
import { Card } from './cards.js'
import { TagIcon } from './icons/tag.js'

interface ArticleCardProps {
  article: WikiArticle
  href: string
  showSnippet?: boolean
  snippetLength?: number
  maxTags?: number
  sourceType?: string | null
  showDate?: boolean
}

function getSnippet(content: string, maxLength: number): string {
  // Remove markdown formatting for snippet
  const plainText = content
    .replace(/#+\s+/g, '') // Remove headers
    .replace(/\*\*|\*|__|_|~~|`/g, '') // Remove formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Replace wiki links with just text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()

  if (plainText.length <= maxLength) return plainText
  return plainText.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ArticleCard({
  article,
  href,
  showSnippet = true,
  snippetLength = 120,
  maxTags = 4,
  sourceType = null,
  showDate = false,
}: ArticleCardProps) {
  const snippet = showSnippet ? getSnippet(article.content, snippetLength) : null
  const dateField = article.frontmatter.date_compiled || article.frontmatter.date_asked || article.frontmatter.date
  const dateDisplay = showDate && dateField ? formatDate(String(dateField)) : null

  return (
    <Card href={href}>
      <div class="flex items-start gap-2 mb-2">
        {sourceType && (
          <span class="shrink-0 mt-0.5">
            {/* Source type icon would go here - passed as child or component */}
          </span>
        )}
        <div class="text-zinc-100 text-sm font-bold group-hover:text-red-500 truncate flex-1">
          {article.title}
        </div>
      </div>

      {snippet && (
        <div class="text-zinc-500 text-xs leading-relaxed mb-3 line-clamp-2">
          {snippet}
        </div>
      )}

      {article.tags.length > 0 && (
        <div class="flex flex-wrap items-center gap-1.5 mt-2">
          {article.tags.slice(0, maxTags).map((tag: string) => (
            <span class="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs px-2 py-0.5 rounded no-scanline" style="position: relative; z-index: 10001;">
              <TagIcon size={10} />
              {tag}
            </span>
          ))}
          {article.tags.length > maxTags && (
            <span class="text-zinc-600 text-xs">+{article.tags.length - maxTags}</span>
          )}
        </div>
      )}

      {dateDisplay && (
        <div class="mt-3 pt-2 border-t border-zinc-800">
          <span class="text-zinc-600 text-xs">{dateDisplay}</span>
        </div>
      )}
    </Card>
  )
}
