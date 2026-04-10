import { Command } from 'commander'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { llm } from '../lib/llm.js'
import {
  listWikiArticles,
  listRawFiles,
  getWikiStats,
  readWikiIndex,
  fixBrokenLinks,
} from '../lib/wiki.js'
import { basename, extname } from 'node:path'

interface LintIssue {
  level: 'error' | 'warning' | 'suggestion'
  message: string
  file?: string
  fixable?: boolean
}

function checkBrokenLinks(articles: ReturnType<typeof listWikiArticles>): LintIssue[] {
  const issues: LintIssue[] = []
  const articleSlugs = new Set(articles.map(a => basename(a.path, '.md')))

  for (const article of articles) {
    const wikiLinks = article.content.match(/\[\[([^\]]+)\]\]/g) ?? []
    for (const link of wikiLinks) {
      const target = link.slice(2, -2).toLowerCase().replace(/\s+/g, '-')
      if (!articleSlugs.has(target)) {
        issues.push({
          level: 'warning',
          message: `Broken wiki link: ${link}`,
          file: article.relativePath,
          fixable: true,
        })
      }
    }
  }

  return issues
}

function checkOrphanedSources(
  articles: ReturnType<typeof listWikiArticles>,
  rawFiles: string[],
  root: string,
): LintIssue[] {
  const issues: LintIssue[] = []
  const paths = kbPaths(root)
  const compiledSources = articles
    .filter(a => a.path.startsWith(paths.wikiSources))
    .map(a => basename(a.path, '.md'))

  const rawNames = rawFiles
    .filter(f => !basename(f).startsWith('.'))
    .map(f => basename(f, extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-'))

  for (const rawName of rawNames) {
    if (!compiledSources.some(s => s.includes(rawName) || rawName.includes(s))) {
      issues.push({
        level: 'warning',
        message: `Raw source not compiled: ${rawName}`,
      })
    }
  }

  return issues
}

function checkMissingFrontmatter(articles: ReturnType<typeof listWikiArticles>): LintIssue[] {
  const issues: LintIssue[] = []

  for (const article of articles) {
    if (!article.frontmatter.title) {
      issues.push({
        level: 'warning',
        message: 'Missing frontmatter: title',
        file: article.relativePath,
        fixable: true,
      })
    }
    if (!Array.isArray(article.frontmatter.tags)) {
      issues.push({
        level: 'warning',
        message: 'Missing frontmatter: tags',
        file: article.relativePath,
        fixable: true,
      })
    }
  }

  return issues
}

export const lintCommand = new Command('lint')
  .description('Health check the wiki')
  .option('--fix', 'fix broken links and missing frontmatter')
  .option('--suggest', 'use LLM to suggest improvements')
  .action(async (options: { fix?: boolean; suggest?: boolean }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    const spinner = ora('Checking wiki health').start()

    const articles = listWikiArticles()
    const rawFiles = listRawFiles()
    const stats = getWikiStats()

    const issues: LintIssue[] = [
      ...checkBrokenLinks(articles),
      ...checkOrphanedSources(articles, rawFiles, root),
      ...checkMissingFrontmatter(articles),
    ]

    spinner.succeed('Health check complete')

    console.log()
    console.log(pc.white('Wiki Stats:'))
    console.log(`  Articles: ${stats.articles}`)
    console.log(`  Words: ~${stats.words.toLocaleString()}`)
    console.log(`  Sources: ${stats.sources}`)
    console.log(`  Concepts: ${stats.concepts}`)
    console.log(`  Raw files: ${rawFiles.length}`)
    console.log()

    if (issues.length === 0) {
      console.log(pc.green('No issues found.'))
    } else {
      const errors = issues.filter(i => i.level === 'error')
      const warnings = issues.filter(i => i.level === 'warning')
      const suggestions = issues.filter(i => i.level === 'suggestion')

      if (errors.length > 0) {
        console.log(pc.red(`Errors (${errors.length}):`))
        for (const issue of errors) {
          console.log(`  ${pc.red('✗')} ${issue.message}${issue.file ? pc.gray(` (${issue.file})`) : ''}`)
        }
        console.log()
      }

      if (warnings.length > 0) {
        console.log(pc.yellow(`Warnings (${warnings.length}):`))
        for (const issue of warnings) {
          const fixTag = issue.fixable ? pc.gray(' [fixable]') : ''
          console.log(`  ${pc.yellow('!')} ${issue.message}${issue.file ? pc.gray(` (${issue.file})`) : ''}${fixTag}`)
        }
        console.log()
      }

      if (suggestions.length > 0) {
        console.log(pc.blue(`Suggestions (${suggestions.length}):`))
        for (const issue of suggestions) {
          console.log(`  ${pc.blue('→')} ${issue.message}${issue.file ? pc.gray(` (${issue.file})`) : ''}`)
        }
        console.log()
      }
    }

    if (options.fix) {
      const fixSpinner = ora('Fixing issues').start()
      let fixedLinks = 0

      const articleSlugs = new Set(articles.map(a => basename(a.path, '.md')))

      for (const article of articles) {
        const linksFixed = fixBrokenLinks(article.path, articleSlugs)
        fixedLinks += linksFixed
      }

      if (fixedLinks > 0) {
        fixSpinner.succeed(`Fixed: ${fixedLinks} broken links`)
      } else {
        fixSpinner.succeed('Nothing to fix')
      }
    } else if (issues.some(i => i.fixable)) {
      console.log(pc.gray(`Run ${pc.cyan('theora lint --fix')} to auto-fix fixable issues.`))
    }

    if (options.suggest && articles.length > 0) {
      const suggestSpinner = ora('Generating improvement suggestions').start()

      const index = readWikiIndex()
      const articleList = articles
        .map(a => `- ${a.title} (${a.relativePath}): ${a.content.slice(0, 200)}...`)
        .join('\n')

      const suggestions = await llm(
        `Review this knowledge base and suggest improvements:

Index:
${index}

Articles:
${articleList}

Known issues:
${issues.map(i => `- [${i.level}] ${i.message}`).join('\n') || 'None'}

Suggest:
1. Missing topics that should have articles
2. Connections between existing articles that aren't linked
3. Areas where data seems inconsistent or incomplete
4. Questions worth investigating to deepen the knowledge base

Be specific and actionable.`,
        {
          system: 'You are a knowledge base quality analyst. Provide specific, actionable suggestions for improving the wiki.',
          maxTokens: 2048,
          action: 'lint',
        },
      )

      suggestSpinner.succeed('Suggestions generated')
      console.log()
      console.log(suggestions)
    }
  })
