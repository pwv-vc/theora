import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { safeJoin } from '../paths.js'
import type { WikiMapGraph } from './graph.js'
import { wikiMapGraphToJson } from './graph.js'
import type { MindMapDiagramPayload } from './mindMapVisualizer.js'
import { getMindMapVisualizer } from './visualizers/index.js'

export interface EmitWikiMapArtifactsOptions {
  outputDir: string
  baseName: string
  graph: WikiMapGraph
  /** Initial expand level hint embedded as a markmap frontmatter comment. */
  expandLevel?: number
  /** If set, basename only; must stay under outputDir via safeJoin */
  outputBasename?: string
  graphJson?: boolean
}

export interface EmitWikiMapArtifactsResult {
  diagramPayload: MindMapDiagramPayload
  sourcePath: string
  writtenPaths: string[]
  primaryOutputPath: string
}

export function emitWikiMapArtifacts(options: EmitWikiMapArtifactsOptions): EmitWikiMapArtifactsResult {
  const visualizer = getMindMapVisualizer('markmap')
  const diagramPayload = visualizer.toDiagram(options.graph)
  mkdirSync(options.outputDir, { recursive: true })

  let source = diagramPayload.source
  if (options.expandLevel && options.expandLevel >= 1 && options.expandLevel <= 8) {
    source = `---\nmarkmap:\n  initialExpandLevel: ${options.expandLevel}\n---\n\n${source}`
  }

  const base = options.baseName
  const ext = diagramPayload.sourceExtension
  const sourcePath = join(options.outputDir, `${base}.${ext}`)
  writeFileSync(sourcePath, source, 'utf-8')
  const writtenPaths: string[] = [sourcePath]

  if (options.graphJson) {
    const p = join(options.outputDir, `${base}.graph.json`)
    writeFileSync(p, wikiMapGraphToJson(options.graph), 'utf-8')
    writtenPaths.push(p)
  }

  let primary = sourcePath
  if (options.outputBasename?.trim()) {
    let target = safeJoin(options.outputDir, basename(options.outputBasename.trim()))
    const hasKnownExt =
      /\.(md|mmd|markdown)$/i.test(target) || target.endsWith('.json')
    const withExt = hasKnownExt ? target : `${target}.${ext}`
    if (withExt !== sourcePath) {
      writeFileSync(withExt, source, 'utf-8')
      writtenPaths.push(withExt)
      primary = withExt
    }
  }

  return {
    diagramPayload,
    sourcePath,
    writtenPaths,
    primaryOutputPath: primary,
  }
}
