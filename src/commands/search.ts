import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { listWikiArticles, getAllTags } from '../lib/wiki.js'
import type { WikiArticle } from '../lib/wiki.js'

interface SearchResult {
  title: string
  path: string
  tags: string[]
  score: number
  snippet: string
}

function searchArticles(query: string, filterTag?: string): SearchResult[] {
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
        path: article.relativePath,
        tags: article.tags,
        score,
        snippet,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
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

export const searchCommand = new Command('search')
  .description('Search the wiki')
  .argument('<query...>', 'search terms')
  .option('-n, --limit <n>', 'max results', '10')
  .option('--tag <tag>', 'filter results by tag')
  .option('--tags', 'list all tags in the wiki')
  .action(async (queryParts: string[], options: { limit: string; tag?: string; tags?: boolean }) => {
    requireKbRoot()

    if (options.tags) {
      const tags = getAllTags()
      if (tags.length === 0) {
        console.log(pc.yellow('No tags found. Compile some sources first.'))
        return
      }
      console.log(pc.gray('Tags in wiki:\n'))
      for (const tag of tags) {
        console.log(`  ${pc.white(tag)}`)
      }
      return
    }

    const query = queryParts.join(' ')
    const limit = parseInt(options.limit, 10)

    const results = searchArticles(query, options.tag).slice(0, limit)

    if (results.length === 0) {
      console.log(pc.yellow(`No results found${options.tag ? ` for tag "${options.tag}"` : ''}.`))
      return
    }

    const tagNote = options.tag ? ` (tag: ${options.tag})` : ''
    console.log(pc.gray(`${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"${tagNote}\n`))

    for (const result of results) {
      const tagStr = result.tags.length > 0 ? ` ${pc.cyan(result.tags.join(', '))}` : ''
      console.log(`  ${pc.white(result.title)}${tagStr}`)
      console.log(`  ${pc.gray(result.path)} ${pc.gray(`(score: ${result.score})`)}`)
      console.log(`  ${pc.dim(result.snippet)}`)
      console.log()
    }
  })
