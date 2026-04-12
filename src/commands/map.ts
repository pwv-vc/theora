import { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stdin as stdinStream, stdout as stdoutStream } from 'node:process'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import {
  listWikiArticles,
  getAllTagsWithCounts,
  ONTOLOGY_TYPES,
  type OntologyType,
} from '../lib/wiki.js'
import {
  articleSlug,
  buildWikiMapGraph,
  emitWikiMapArtifacts,
  type WikiMapCenter,
} from '../lib/wikiMap/index.js'
import { normalizeTag } from '../lib/utils.js'

function isTTYInteractive(allowPrompt: boolean): boolean {
  if (!allowPrompt) return false
  return Boolean(stdoutStream.isTTY && stdinStream.isTTY)
}

function parseOntology(s: string | undefined): OntologyType | undefined {
  if (!s?.trim()) return undefined
  const t = s.trim().toLowerCase() as OntologyType
  return ONTOLOGY_TYPES.includes(t) ? t : undefined
}

function readKbName(root: string): string {
  const configPath = join(root, '.theora', 'config.json')
  if (!existsSync(configPath)) return 'Knowledge Base'
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as { name?: string }
    return String(config.name ?? 'Knowledge Base')
  } catch {
    return 'Knowledge Base'
  }
}

/** Slug for --around (concept / source / filed output). */
function isArticleSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(s)
}

function mapFileSlug(center: WikiMapCenter): string {
  if (center.type === 'tag') return `map-tag-${normalizeTag(center.tag).replace(/[^a-z0-9-]+/g, '-')}`
  if (center.type === 'entity') return `map-entity-${center.entityKey.replace(/[^a-z0-9-]+/g, '-')}`
  if (center.type === 'overview') return 'map-overview'
  return `map-${center.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
}

function mindMapFocusLabel(center: WikiMapCenter, articles: ReturnType<typeof listWikiArticles>): string {
  if (center.type === 'article') {
    const slug = center.slug.trim().toLowerCase()
    const found = articles.find((a) => articleSlug(a) === slug)
    return found?.title ?? center.slug
  }
  if (center.type === 'tag') return normalizeTag(center.tag)
  if (center.type === 'entity') return center.entityKey
  return center.kbName
}

async function promptMapOptions(
  paths: ReturnType<typeof kbPaths>,
): Promise<{ center: WikiMapCenter; depth: number; maxNodes: number } | null> {
  const articles = listWikiArticles()

  const mode = await p.select({
    message: 'Choose map focal point',
    options: [
      { value: 'concept' as const, label: 'Concept — pick a concept article' },
      { value: 'ontology' as const, label: 'Ontology — pick type, then a concept' },
      { value: 'source' as const, label: 'Source — pick a source article' },
      { value: 'tag' as const, label: 'Tag — center on one tag' },
    ],
  })
  if (p.isCancel(mode)) return null

  let center: WikiMapCenter | null = null

  if (mode === 'concept') {
    const concepts = articles.filter((a) => a.path.startsWith(paths.wikiConcepts))
    if (concepts.length === 0) {
      p.cancel('No concept articles found. Run theora compile first.')
      return null
    }
    const slug = await p.select({
      message: 'Concept',
      options: concepts
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((a) => ({
          value: articleSlug(a),
          label: `${a.title} (${articleSlug(a)})`,
        })),
    })
    if (p.isCancel(slug)) return null
    center = { type: 'article', slug }
  } else if (mode === 'source') {
    const sources = articles.filter((a) => a.path.startsWith(paths.wikiSources))
    if (sources.length === 0) {
      p.cancel('No source articles found.')
      return null
    }
    const slug = await p.select({
      message: 'Source',
      options: sources
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((a) => ({
          value: articleSlug(a),
          label: `${a.title} (${articleSlug(a)})`,
        })),
    })
    if (p.isCancel(slug)) return null
    center = { type: 'article', slug }
  } else if (mode === 'tag') {
    const tags = getAllTagsWithCounts()
    if (tags.length === 0) {
      p.cancel('No tags found in the wiki.')
      return null
    }
    const tag = await p.select({
      message: 'Tag',
      options: tags.map((t) => ({
        value: t.tag,
        label: `${t.tag} (${t.count} articles)`,
      })),
    })
    if (p.isCancel(tag)) return null
    center = { type: 'tag', tag }
  } else {
    const ot = await p.select({
      message: 'Ontology type',
      options: ONTOLOGY_TYPES.map((t) => ({ value: t, label: t })),
    })
    if (p.isCancel(ot)) return null
    const concepts = articles.filter((a) => {
      if (!a.path.startsWith(paths.wikiConcepts)) return false
      const raw = a.frontmatter.ontology
      if (!Array.isArray(raw)) return false
      return raw.map((x) => String(x).toLowerCase()).includes(String(ot).toLowerCase())
    })
    if (concepts.length === 0) {
      p.cancel(`No concepts with ontology "${String(ot)}".`)
      return null
    }
    const slug = await p.select({
      message: 'Concept',
      options: concepts
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((a) => ({
          value: articleSlug(a),
          label: `${a.title} (${articleSlug(a)})`,
        })),
    })
    if (p.isCancel(slug)) return null
    center = { type: 'article', slug }
  }

  const depthStr = await p.text({
    message: 'Depth (article hops from center, 1–8)',
    initialValue: '2',
    validate: (v) => {
      const n = Number(String(v ?? '').trim())
      if (!Number.isInteger(n) || n < 1 || n > 8) return 'Enter an integer from 1 to 8'
      return undefined
    },
  })
  if (p.isCancel(depthStr)) return null

  const maxStr = await p.text({
    message: 'Max nodes (including tags, entities, ontology)',
    initialValue: '48',
    validate: (v) => {
      const n = Number(String(v ?? '').trim())
      if (!Number.isInteger(n) || n < 4 || n > 200) return 'Enter an integer from 4 to 200'
      return undefined
    },
  })
  if (p.isCancel(maxStr)) return null

  return {
    center,
    depth: Number(String(depthStr).trim()),
    maxNodes: Number(String(maxStr).trim()),
  }
}

export const mapCommand = new Command('map')
  .description(
    'Build a focal wiki graph and write markmap diagram source (.md) — no Puppeteer/Chrome',
  )
  .option('--around <slug>', 'center on this article slug (concept, source, or filed query)')
  .option(
    '--tag <tag>',
    'with --around: only expand articles with this tag; without --around: center on this tag',
  )
  .option(
    '--entity <key>',
    'center on an entity key category:name (e.g. person:jane-doe); exclusive with other focus flags',
  )
  .option('--overview', 'center on KB hub overview (uses .theora/config.json name)')
  .option('--ontology <type>', `filter concepts by ontology (${ONTOLOGY_TYPES.join(', ')})`)
  .option('--depth <n>', 'article hops from center (1–8)', '2')
  .option('--max-nodes <n>', 'maximum nodes in the graph', '48')
  .option('--expand-level <n>', 'initial expand level hint for markmap renderers (1–8)')
  .option('--output <path>', 'write to this path under output/ (basename only, safe join)')
  .option('--graph-json', 'also write graph JSON next to the diagram')
  .option(
    '--no-interactive',
    'do not prompt; require --around, --tag (without --around), --entity, or --overview when focus is needed',
  )
  .action(
    async (opts: {
      around?: string
      tag?: string
      entity?: string
      overview?: boolean
      ontology?: string
      depth: string
      maxNodes: string
      expandLevel?: string
      output?: string
      graphJson?: boolean
      interactive?: boolean
    }) => {
      const root = requireKbRoot()
      const paths = kbPaths(root)
      const articles = listWikiArticles()
      const allowPrompt = opts.interactive !== false

      let center: WikiMapCenter
      let depth = Math.min(8, Math.max(1, parseInt(opts.depth, 10) || 2))
      let maxNodes = Math.min(200, Math.max(4, parseInt(opts.maxNodes, 10) || 48))
      const ontologyFilter = parseOntology(opts.ontology)

      const around = opts.around?.trim()
      const tagOpt = opts.tag?.trim()
      const entityRaw = opts.entity?.trim()
      const wantsOverview = opts.overview === true

      if (ontologyFilter === undefined && opts.ontology?.trim()) {
        console.error(
          pc.red(
            `Invalid --ontology "${opts.ontology}". Use one of: ${ONTOLOGY_TYPES.join(', ')}.`,
          ),
        )
        process.exitCode = 1
        return
      }

      const hasArticleCenter = Boolean(around)
      const hasTagOnlyCenter = Boolean(tagOpt) && !around
      const hasEntityCenter = Boolean(entityRaw)
      const hasOverviewCenter = wantsOverview

      const focusModes =
        (hasOverviewCenter ? 1 : 0) +
        (hasEntityCenter ? 1 : 0) +
        (hasArticleCenter ? 1 : 0) +
        (hasTagOnlyCenter ? 1 : 0)

      if (focusModes > 1) {
        console.error(
          pc.red(
            'Use only one map focus: --overview, --entity <key>, --around <slug>, or --tag <tag> (without --around).',
          ),
        )
        process.exitCode = 1
        return
      }

      if (focusModes === 0) {
        if (!isTTYInteractive(allowPrompt)) {
          console.error(
            pc.red(
              'Specify a focus: --around <slug>, --tag <tag>, --entity <key>, or --overview — or run in a terminal for interactive setup.',
            ),
          )
          process.exitCode = 1
          return
        }
        p.intro(pc.magenta('Wiki map'))
        const picked = await promptMapOptions(paths)
        if (!picked) {
          p.outro(pc.yellow('Cancelled.'))
          return
        }
        center = picked.center
        depth = picked.depth
        maxNodes = picked.maxNodes
        p.outro(pc.green('Building graph…'))
      } else if (hasOverviewCenter) {
        center = { type: 'overview', kbName: readKbName(root) }
      } else if (hasEntityCenter) {
        center = { type: 'entity', entityKey: entityRaw! }
      } else if (hasTagOnlyCenter) {
        center = { type: 'tag', tag: tagOpt! }
      } else {
        if (!isArticleSlug(around!)) {
          console.error(
            pc.red(
              `Invalid --around slug "${around}". Use lowercase letters, digits, and hyphens only (e.g. my-concept).`,
            ),
          )
          process.exitCode = 1
          return
        }
        center = { type: 'article', slug: around! }
      }

      const tagFilter =
        hasArticleCenter && tagOpt ? normalizeTag(tagOpt) : undefined

      const graph = buildWikiMapGraph({
        paths,
        articles,
        center,
        depth,
        maxNodes,
        tagFilter,
        ontologyFilter,
      })

      if (graph.nodes.length === 0) {
        const msg =
          center.type === 'article'
            ? `No graph: unknown slug "${center.slug}" or filters excluded all nodes.`
            : center.type === 'tag'
              ? 'No graph: no articles match this tag and filters.'
              : center.type === 'entity'
                ? `No graph: no articles for entity "${center.entityKey}" or filters excluded all nodes.`
                : 'No graph: overview could not be built (empty wiki or filters).'
        console.error(pc.red(msg))
        process.exitCode = 1
        return
      }

      const baseName = mapFileSlug(center)
      const emitted = emitWikiMapArtifacts({
        outputDir: paths.output,
        baseName,
        graph,
        focusLabel: mindMapFocusLabel(center, articles),
        expandLevel: opts.expandLevel ? parseInt(opts.expandLevel, 10) || undefined : undefined,
        outputBasename: opts.output?.trim(),
        graphJson: Boolean(opts.graphJson),
      })

      console.log(pc.green(`Wrote ${emitted.primaryOutputPath}`))
    },
  )
