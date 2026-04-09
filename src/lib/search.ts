import { listWikiArticles } from './wiki.js'

export interface SearchResult {
  title: string
  path: string
  relativePath: string
  tags: string[]
  score: number
  snippet: string
}

function extractSnippet(content: string, terms: string[]): string {
  const lines = content.split('\n').filter(l => l.trim())
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (terms.some(t => lower.includes(t))) {
      const trimmed = line.trim()
      return trimmed.length > 120 ? trimmed.slice(0, 120) + '...' : trimmed
    }
  }
  const first = lines[0]?.trim() ?? ''
  return first.length > 120 ? first.slice(0, 120) + '...' : first
}

export function searchArticles(query: string, filterTag?: string): SearchResult[] {
  let articles = listWikiArticles()

  if (filterTag) {
    articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results: SearchResult[] = []

  for (const article of articles) {
    const text = (article.title + ' ' + article.content).toLowerCase()
    let score = 0

    for (const term of terms) {
      const regex = new RegExp(term, 'gi')
      const matches = text.match(regex)
      if (matches) {
        score += matches.length
        if (article.title.toLowerCase().includes(term)) {
          score += 5
        }
      }
    }

    if (article.tags.some(t => terms.includes(t.toLowerCase()))) {
      score += 3
    }

    if (score > 0) {
      const snippet = extractSnippet(article.content, terms)
      results.push({
        title: article.title,
        path: article.path,
        relativePath: article.relativePath,
        tags: article.tags,
        score,
        snippet,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
