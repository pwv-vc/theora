import { llm } from './llm.js'
import type { WikiArticle } from './wiki.js'

export async function findRelevantArticles(
  question: string,
  index: string,
  articles: WikiArticle[],
): Promise<WikiArticle[]> {
  if (articles.length <= 10) return articles

  const articleList = articles
    .map((a, i) => {
      const tags = a.tags.length ? ` [${a.tags.join(', ')}]` : ''
      return `${i}: ${a.title}${tags} (${a.relativePath})`
    })
    .join('\n')

  const response = await llm(
    `Given this question: "${question}"

And these wiki articles:
${articleList}

Return a JSON array of the indices (numbers) of the most relevant articles to answer this question. Select up to 15 articles. Return only the JSON array, no other text.`,
    {
      system: 'You are a search relevance ranker. Return only a JSON array of numbers.',
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
    .map(a => `## ${a.title}\nPath: ${a.relativePath}\n\n${a.content}`)
    .join('\n\n---\n\n')
}
