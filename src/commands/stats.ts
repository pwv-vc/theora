import { Command } from 'commander'
import pc from 'picocolors'
import { readdirSync, existsSync } from 'node:fs'
import { requireKbRoot, kbPaths } from '../lib/paths.js'
import { listWikiArticles, listRawFiles, getWikiStats } from '../lib/wiki.js'
import { readManifest } from '../lib/manifest.js'
import { readConfig } from '../lib/config.js'
import { printCumulativeStats } from '../lib/stats.js'

function section(title: string): void {
  console.log(pc.white(pc.bold(title)))
}

function row(label: string, value: string | number): void {
  const padded = `${label}`.padEnd(22)
  console.log(`  ${pc.gray(padded)} ${value}`)
}

function kbAge(created: string): string {
  const ms = Date.now() - new Date(created).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

export const statsCommand = new Command('stats')
  .description('Show knowledge base statistics')
  .action(() => {
    const root = requireKbRoot()
    const paths = kbPaths(root)

    const config = readConfig()
    const wikiStats = getWikiStats()
    const rawFiles = listRawFiles().filter(f => !f.includes('/.'))
    const articles = listWikiArticles()
    const manifest = readManifest()

    console.log()

    // --- Knowledge Base ---
    section('Knowledge Base')
    row('Name', pc.cyan(config.name))
    row('Created', kbAge(config.created))
    row('Provider', `${config.provider} / ${pc.cyan(config.model)}`)
    row('Concurrency', config.compileConcurrency)
    console.log()

    // --- Wiki Content ---
    section('Wiki')
    row('Sources', wikiStats.sources)
    row('Concepts', wikiStats.concepts)
    row('Total articles', wikiStats.articles)
    row('Total words', `~${wikiStats.words.toLocaleString()}`)
    if (wikiStats.articles > 0) {
      row('Avg words/article', `~${Math.round(wikiStats.words / wikiStats.articles).toLocaleString()}`)
    }
    if (wikiStats.sources > 0 && wikiStats.concepts > 0) {
      row('Concept:source ratio', `${(wikiStats.concepts / wikiStats.sources).toFixed(2)}`)
    }
    console.log()

    // --- Raw Files ---
    section('Raw Files')
    row('Total ingested', rawFiles.length)

    const urlSources = manifest.filter(e => e.url)
    const fileSources = manifest.filter(e => !e.url)
    if (urlSources.length > 0) row('From URLs', urlSources.length)
    if (fileSources.length > 0) row('From files', fileSources.length)

    const uncompiled = rawFiles.length - wikiStats.sources
    if (uncompiled > 0) row('Uncompiled', pc.yellow(String(uncompiled)))
    console.log()

    // --- Tags ---
    const tagCounts = new Map<string, number>()
    for (const article of articles) {
      for (const tag of article.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }

    if (tagCounts.size > 0) {
      section('Tags')
      row('Unique tags', tagCounts.size)
      const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      for (const [tag, count] of sorted) {
        row(tag, pc.gray(`${count} article${count !== 1 ? 's' : ''}`))
      }
      if (tagCounts.size > 8) {
        console.log(`  ${pc.gray(`…and ${tagCounts.size - 8} more`)}`)
      }
      console.log()
    }

    // --- Source Types ---
    const sourceTypes = new Map<string, number>()
    for (const article of articles) {
      const t = article.frontmatter.source_type as string | undefined
      if (t) sourceTypes.set(t, (sourceTypes.get(t) ?? 0) + 1)
    }

    if (sourceTypes.size > 0) {
      section('Source Types')
      for (const [type, count] of [...sourceTypes.entries()].sort((a, b) => b[1] - a[1])) {
        row(type, count)
      }
      console.log()
    }

    // --- Output ---
    if (existsSync(paths.output)) {
      const outputFiles = readdirSync(paths.output).filter(f => !f.startsWith('.'))
      if (outputFiles.length > 0) {
        const byExt = new Map<string, number>()
        for (const f of outputFiles) {
          const ext = f.includes('.') ? f.split('.').pop()! : 'other'
          byExt.set(ext, (byExt.get(ext) ?? 0) + 1)
        }
        section('Output')
        row('Total files', outputFiles.length)
        for (const [ext, count] of [...byExt.entries()].sort((a, b) => b[1] - a[1])) {
          row(`.${ext}`, count)
        }
        console.log()
      }
    }

    // --- LLM Usage ---
    section('LLM Usage')
    printCumulativeStats()
    console.log()
  })
