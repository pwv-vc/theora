import { listWikiArticles, type WikiArticle } from './wiki.js'

export interface SearchResult {
  title: string
  path: string
  relativePath: string
  href: string
  tags: string[]
  matchedTags: string[]
  score: number
  snippet: string
  typeLabel: 'source' | 'concept' | 'answer'
  matchReasons: string[]
}

function getTypeLabel(article: WikiArticle): 'source' | 'concept' | 'answer' {
  if (article.relativePath.startsWith('output/')) return 'answer'
  if (article.relativePath.startsWith('wiki/concepts/')) return 'concept'
  return 'source'
}

function getHref(article: WikiArticle): string {
  const slug = article.path.split('/').pop()?.replace('.md', '') ?? ''
  if (article.relativePath.startsWith('output/')) return `/output/${slug}`
  if (article.relativePath.startsWith('wiki/concepts/')) return `/wiki/concepts/${slug}`
  return `/wiki/sources/${slug}`
}

function extractSnippet(content: string, terms: string[]): string {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  const preferredLine = lines.find(line => {
    const lower = line.toLowerCase()
    return terms.some(term => lower.includes(term))
  }) ?? lines[0] ?? ''

  return preferredLine.length > 200 ? `${preferredLine.slice(0, 197)}...` : preferredLine
}

function scoreArticle(article: WikiArticle, terms: string[], selectedTags: string[]): {
  score: number
  matchReasons: string[]
  matchedTags: string[]
  snippet: string
} {
  const title = article.title.toLowerCase()
  const body = article.content.toLowerCase()
  const tagSet = new Set(article.tags.map(tag => tag.toLowerCase()))
  const matchedTags = article.tags.filter(tag => terms.includes(tag.toLowerCase()))
  const typeLabel = getTypeLabel(article)
  const reasons: string[] = []
  let score = 0

  if (terms.length === 0) {
    const activeTagMatches = article.tags.filter(tag => selectedTags.includes(tag.toLowerCase()))
    if (activeTagMatches.length > 0) reasons.push(`${activeTagMatches.length} active tag${activeTagMatches.length === 1 ? '' : 's'}`)
    reasons.push(`${typeLabel} browse`)
    return {
      score: Math.max(1, activeTagMatches.length * 10),
      matchReasons: reasons,
      matchedTags: activeTagMatches,
      snippet: extractSnippet(article.content, []),
    }
  }

  let titleHits = 0
  let bodyHits = 0
  let typeHits = 0

  for (const term of terms) {
    if (title.includes(term)) {
      score += 18
      titleHits++
    }

    if (body.includes(term)) {
      const occurrences = body.split(term).length - 1
      score += Math.min(occurrences, 4) * 4
      bodyHits += occurrences
    }

    if (typeLabel.includes(term)) {
      score += 10
      typeHits++
    }

    if (tagSet.has(term)) {
      score += 14
    }
  }

  if (titleHits > 0) reasons.push('title match')
  if (matchedTags.length > 0) reasons.push(`${matchedTags.length} matching tag${matchedTags.length === 1 ? '' : 's'}`)
  if (typeHits > 0) reasons.push('type match')
  if (bodyHits > 0) reasons.push('body match')

  return {
    score,
    matchReasons: reasons,
    matchedTags,
    snippet: extractSnippet(article.content, terms),
  }
}

function intersectsAllSelectedTags(article: WikiArticle, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) return true
  const normalized = new Set(article.tags.map(tag => tag.toLowerCase()))
  return selectedTags.every(tag => normalized.has(tag.toLowerCase()))
}

export function searchArticles(query: string, selectedTags: string[] = []): SearchResult[] {
  const articles = listWikiArticles()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results: SearchResult[] = []

  for (const article of articles) {
    if (!intersectsAllSelectedTags(article, selectedTags)) continue

    const scored = scoreArticle(article, terms, selectedTags.map(tag => tag.toLowerCase()))
    if (terms.length > 0 && scored.score <= 0) continue
    if (terms.length === 0 && selectedTags.length === 0) continue

    results.push({
      title: article.title,
      path: article.path,
      relativePath: article.relativePath,
      href: getHref(article),
      tags: article.tags,
      matchedTags: scored.matchedTags,
      score: scored.score + selectedTags.length * 6,
      snippet: scored.snippet,
      typeLabel: getTypeLabel(article),
      matchReasons: scored.matchReasons,
    })
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.title.localeCompare(b.title)
  })
}
