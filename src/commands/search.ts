import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { getAllTags } from '../lib/wiki.js'
import { searchArticles } from '../lib/search.js'

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

    let response: ReturnType<typeof searchArticles>
    try {
      response = searchArticles(query, options.tag)
    } catch (e) {
      console.log(pc.yellow(e instanceof Error ? e.message : String(e)))
      return
    }

    const { results, suggestedQuery } = response
    const limited = results.slice(0, limit)

    if (limited.length === 0) {
      console.log(pc.yellow(`No results found${options.tag ? ` for tag "${options.tag}"` : ''}.`))
      if (suggestedQuery && suggestedQuery.trim().toLowerCase() !== query.trim().toLowerCase()) {
        console.log(pc.cyan(`Did you mean: ${suggestedQuery}`))
      }
      return
    }

    if (
      suggestedQuery &&
      suggestedQuery.trim().toLowerCase() !== query.trim().toLowerCase()
    ) {
      console.log(pc.cyan(`Did you mean: ${suggestedQuery}`))
    }

    const tagNote = options.tag ? ` (tag: ${options.tag})` : ''
    console.log(pc.gray(`${limited.length} result${limited.length !== 1 ? 's' : ''} for "${query}"${tagNote}\n`))

    for (const result of limited) {
      const tagStr = result.tags.length > 0 ? ` ${pc.cyan(result.tags.join(', '))}` : ''
      const scoreLabel = Number.isFinite(result.score) ? result.score.toFixed(3) : String(result.score)
      console.log(`  ${pc.white(result.title)}${tagStr}`)
      console.log(`  ${pc.gray(result.path)} ${pc.gray(`(score: ${scoreLabel})`)}`)
      console.log(`  ${pc.dim(result.snippet)}`)
      console.log()
    }
  })
