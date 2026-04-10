import { Command } from 'commander'
import pc from 'picocolors'
import ora from 'ora'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { llm } from '../lib/llm.js'
import {
  listWikiArticles,
  listRawFiles,
  getWikiStats,
  readWikiIndex,
  fixBrokenLinks,
} from '../lib/wiki.js'
import { normalizeTag } from '../lib/utils.js'
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

interface TagDuplicateGroup {
  normalized: string
  variants: string[]
  articles: Map<string, string[]> // article path -> tags found
}

function findDuplicateTagVariants(articles: ReturnType<typeof listWikiArticles>): TagDuplicateGroup[] {
  const groups = new Map<string, TagDuplicateGroup>()

  for (const article of articles) {
    if (!Array.isArray(article.tags)) continue

    for (const tag of article.tags) {
      const normalized = normalizeTag(tag)
      if (!normalized) continue

      // If tag differs from normalized form, it's a variant that could cause dupes
      if (tag !== normalized) {
        const group: TagDuplicateGroup = groups.get(normalized) ?? {
          normalized,
          variants: [],
          articles: new Map(),
        }
        if (!group.variants.includes(tag)) {
          group.variants.push(tag)
        }
        const articleTags = group.articles.get(article.relativePath) ?? []
        if (!articleTags.includes(tag)) {
          articleTags.push(tag)
        }
        group.articles.set(article.relativePath, articleTags)
        groups.set(normalized, group)
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.normalized.localeCompare(b.normalized))
}

function checkDuplicateTagVariants(articles: ReturnType<typeof listWikiArticles>): LintIssue[] {
  const issues: LintIssue[] = []
  const duplicates = findDuplicateTagVariants(articles)

  for (const group of duplicates) {
    const articleList = [...group.articles.entries()]
      .map(([path, tags]) => `${path} (${tags.join(', ')})`)
      .join(', ')
    issues.push({
      level: 'warning',
      message: `Tag variants for "${group.normalized}": ${group.variants.join(', ')}`,
      file: articleList,
      fixable: true,
    })
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
      ...checkDuplicateTagVariants(articles),
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
      let fixedTags = 0

      const articleSlugs = new Set(articles.map(a => basename(a.path, '.md')))

      for (const article of articles) {
        const linksFixed = fixBrokenLinks(article.path, articleSlugs)
        fixedLinks += linksFixed
      }

      // Fix tag duplicates by normalizing all tags
      const duplicateGroups = findDuplicateTagVariants(articles)
      for (const group of duplicateGroups) {
        for (const [articlePath, tags] of group.articles) {
          const fullPath = join(root, articlePath)
          const raw = readFileSync(fullPath, 'utf-8')
          const { data, content } = matter(raw)
          if (Array.isArray(data.tags)) {
            const originalTags = data.tags as string[]
            const normalizedTags = originalTags.map(t => normalizeTag(t))
            const uniqueTags = [...new Set(normalizedTags)].sort()
            if (JSON.stringify(originalTags) !== JSON.stringify(uniqueTags)) {
              data.tags = uniqueTags
              writeFileSync(fullPath, matter.stringify(content, data))
              fixedTags++
            }
          }
        }
      }

      const totalFixed = fixedLinks + fixedTags
      if (totalFixed > 0) {
        const parts = []
        if (fixedLinks > 0) parts.push(`${fixedLinks} broken links`)
        if (fixedTags > 0) parts.push(`${fixedTags} tag issues`)
        fixSpinner.succeed(`Fixed: ${parts.join(', ')}`)
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
