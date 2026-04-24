import { basename } from 'node:path'
import { llm } from './llm.js'
import { slugify } from './utils.js'
import { readConfig } from './config.js'
import type { WikiArticle } from './wiki.js'

// Build entity summary for ranking context
function buildEntitySummary(entities: Record<string, string[]> | undefined): string {
  if (!entities || Object.keys(entities).length === 0) return ''
  const parts: string[] = []
  for (const [category, items] of Object.entries(entities)) {
    if (items.length > 0) {
      const slugifiedItems = items.slice(0, 5).map(item => slugify(item)).join(', ')
      parts.push(`${category}/${slugifiedItems}`)
    }
  }
  return parts.length > 0 ? ` | ${parts.join(' | ')}` : ''
}

export interface RankedArticle extends WikiArticle {
  rank?: number
}

export interface RankingResult {
  articles: RankedArticle[]
  totalConsidered: number
  selectedCount: number
}

export async function findRelevantArticles(
  question: string,
  index: string,
  articles: WikiArticle[],
  maxArticles?: number,
): Promise<RankingResult> {
  const config = readConfig()
  const maxToSelect = maxArticles ?? config.askMaxContextArticles ?? 20

  if (articles.length <= 10) {
    return {
      articles: articles.map((a, i) => ({ ...a, rank: i + 1 })),
      totalConsidered: articles.length,
      selectedCount: articles.length,
    }
  }

  const articleList = articles
    .map((a, i) => {
      const tags = a.tags.length ? ` [${a.tags.join(', ')}]` : ''
      const entities = buildEntitySummary(a.entities)
      return `${i}: ${a.title}${tags}${entities} (${a.relativePath})`
    })
    .join('\n')

  const response = await llm(
    `Given this question: "${question}"

And these wiki articles (with their extracted entities like people, actors, organizations, tv-series, movies, events, dates, products, and places):
${articleList}

Return a JSON array of the indices (numbers) of the most relevant articles to answer this question. Consider both the title/tags and the extracted entities when determining relevance. Be generous - include any article that might contain relevant information even if it's not a perfect match. Select up to ${maxToSelect} articles. Return only the JSON array, no other text.`,
    {
      system: 'You are a search relevance ranker. Consider article titles, tags, and extracted entities (people, actors, organizations, tv-series, movies, dates, events, products, places) when ranking. Be generous in selecting articles that might contain relevant information. Return only a JSON array of numbers.',
      maxTokens: 256,
      action: 'rank',
    },
  )

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const indices: number[] = JSON.parse(cleaned)
    const selected = indices
      .filter(i => i >= 0 && i < articles.length)
      .slice(0, maxToSelect)
      .map((i, rank) => ({ ...articles[i], rank: rank + 1 }))
    return {
      articles: selected,
      totalConsidered: articles.length,
      selectedCount: selected.length,
    }
  } catch {
    const fallback = articles.slice(0, maxToSelect).map((a, i) => ({ ...a, rank: i + 1 }))
    return {
      articles: fallback,
      totalConsidered: articles.length,
      selectedCount: fallback.length,
    }
  }
}

const MAX_CONTEXT_TOKENS = 70_000
const MAX_ARTICLE_TOKENS = 20_000
const CHARS_PER_TOKEN = 4
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN
const MAX_ARTICLE_CHARS = MAX_ARTICLE_TOKENS * CHARS_PER_TOKEN

function truncateArticleContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content
  return content.slice(0, maxChars) + '\n\n[Article truncated due to length]'
}

export function buildContext(articles: WikiArticle[]): string {
  let result = ''
  let totalChars = 0

  for (const a of articles) {
    const slug = basename(a.path, '.md')
    const content = truncateArticleContent(a.content, MAX_ARTICLE_CHARS)
    const piece = `## ${a.title}\nWiki-link: [[${slug}]]\n\n${content}`
    const separator = '\n\n---\n\n'

    const addedChars = result.length === 0 ? piece.length : separator.length + piece.length

    if (totalChars + addedChars > MAX_CONTEXT_CHARS && totalChars > 0) {
      break
    }

    if (result.length === 0) {
      result = piece
      totalChars = piece.length
    } else {
      result += separator + piece
      totalChars += separator.length + piece.length
    }
  }

  return result
}

export function buildContextBatches(articles: WikiArticle[], maxTokensPerBatch: number = MAX_CONTEXT_TOKENS): string[] {
  const batches: string[] = []
  let currentBatchPieces: string[] = []
  let currentChars = 0
  const maxChars = maxTokensPerBatch * CHARS_PER_TOKEN
  const separator = '\n\n---\n\n'

  for (const a of articles) {
    const slug = basename(a.path, '.md')
    const content = truncateArticleContent(a.content, MAX_ARTICLE_CHARS)
    const piece = `## ${a.title}\nWiki-link: [[${slug}]]\n\n${content}`
    const pieceChars = piece.length
    const separatorChars = separator.length

    const wouldNeedSeparator = currentBatchPieces.length > 0
    const addedChars = wouldNeedSeparator ? separatorChars + pieceChars : pieceChars

    if (currentChars + addedChars > maxChars && currentBatchPieces.length > 0) {
      batches.push(currentBatchPieces.join(separator))
      currentBatchPieces = [piece]
      currentChars = pieceChars
    } else {
      currentBatchPieces.push(piece)
      currentChars += addedChars
    }
  }

  if (currentBatchPieces.length > 0) {
    batches.push(currentBatchPieces.join(separator))
  }

  return batches
}
