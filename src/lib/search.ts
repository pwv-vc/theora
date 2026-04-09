import { listWikiArticles } from './wiki.js'

export interface SearchResult {
  title: string
  path: string
  relativePath: string
  tags: string[]
  score: number
  snippet: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, (_, s) => s.replace(/-/g, ' '))  // [[wiki-link]] → wiki link
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                        // [text](url) → text
    .replace(/^#{1,6}\s+/gm, '')                                    // ## headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')                              // **bold**
    .replace(/\*([^*]+)\*/g, '$1')                                  // *italic*
    .replace(/_([^_]+)_/g, '$1')                                    // _italic_
    .replace(/`([^`]+)`/g, '$1')                                    // `code`
    .replace(/^[-*+]\s+/gm, '')                                     // - list items
    .replace(/^\d+\.\s+/gm, '')                                     // 1. ordered list
    .replace(/^---+$/gm, '')                                        // --- dividers
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSnippet(content: string, terms: string[]): string {
  const lines = content.split('\n').filter(l => l.trim())
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (terms.some(t => lower.includes(t))) {
      const clean = stripMarkdown(line)
      if (!clean) continue
      return clean.length > 160 ? clean.slice(0, 160) + '...' : clean
    }
  }
  for (const line of lines) {
    const clean = stripMarkdown(line)
    if (clean) return clean.length > 160 ? clean.slice(0, 160) + '...' : clean
  }
  return ''
}

export function searchArticles(query: string, filterTag?: string): SearchResult[] {
  let articles = listWikiArticles()

  if (filterTag) {
    articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) {
    return articles
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(article => ({
        title: article.title,
        path: article.path,
        relativePath: article.relativePath,
        tags: article.tags,
        score: 0,
        snippet: extractSnippet(article.content, []),
      }))
  }

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
