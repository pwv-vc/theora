import { basename } from 'node:path'
import { llm } from './llm.js'
import { slugify } from './utils.js'
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

export async function findRelevantArticles(
  question: string,
  index: string,
  articles: WikiArticle[],
): Promise<WikiArticle[]> {
  if (articles.length <= 10) return articles

  const articleList = articles
    .map((a, i) => {
      const tags = a.tags.length ? ` [${a.tags.join(', ')}]` : ''
      const entities = buildEntitySummary(a.entities)
      return `${i}: ${a.title}${tags}${entities} (${a.relativePath})`
    })
    .join('\n')

  const response = await llm(
    `Given this question: "${question}"

And these wiki articles (with their extracted entities like people, organizations, events, dates, products, and places):
${articleList}

Return a JSON array of the indices (numbers) of the most relevant articles to answer this question. Consider both the title/tags and the extracted entities when determining relevance. Select up to 15 articles. Return only the JSON array, no other text.`,
    {
      system: 'You are a search relevance ranker. Consider article titles, tags, and extracted entities (people, organizations, dates, events) when ranking. Return only a JSON array of numbers.',
      maxTokens: 256,
      action: 'rank',
    },
  )

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const indices: number[] = JSON.parse(cleaned)
    return indices
      .filter(i => i >= 0 && i < articles.length)
      .map(i => articles[i])
  } catch {
    return articles.slice(0, 15)
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
