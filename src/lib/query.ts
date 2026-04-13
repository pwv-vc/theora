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

export function buildContext(articles: WikiArticle[]): string {
  return articles
    .map(a => {
      const slug = basename(a.path, '.md')
      return `## ${a.title}\nWiki-link: [[${slug}]]\n\n${a.content}`
    })
    .join('\n\n---\n\n')
}
