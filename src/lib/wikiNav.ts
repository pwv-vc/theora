import { listWikiArticles, getAllTagsWithCounts } from './wiki.js'
import type { WikiArticle, TagWithCount } from './wiki.js'
import { requireKbRoot, kbPaths } from './paths.js'

export type WikiNavLists = {
  sources: WikiArticle[]
  concepts: WikiArticle[]
  queries: WikiArticle[]
  tagsWithCounts: TagWithCount[]
}

export function loadWikiNavLists(activeTag: string): WikiNavLists {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  let articles = listWikiArticles()

  if (activeTag) {
    articles = articles.filter(a =>
      a.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()),
    )
  }

  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const queries = articles.filter(a => a.path.startsWith(paths.output))
  const tagsWithCounts = getAllTagsWithCounts()

  return { sources, concepts, queries, tagsWithCounts }
}
