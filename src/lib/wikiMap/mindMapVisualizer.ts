import type { WikiMapGraph } from './graph.js'

/**
 * Identifies a pluggable mind-map backend. Extend this union and register in
 * `visualizers/index.ts` when adding implementations (e.g. markmap markdown, Cytoscape JSON).
 */
export type MindMapVisualizerId = 'markmap'

/**
 * What the emitted `source` string represents — drives file extension and web embedding.
 */
export type MindMapDiagramKind = 'markdown' | 'json'

/**
 * Portable diagram document produced from the canonical {@link WikiMapGraph}.
 * Same graph → different payloads per visualizer; raster/web layers consume this type.
 */
export interface MindMapDiagramPayload {
  visualizerId: MindMapVisualizerId
  diagramKind: MindMapDiagramKind
  mimeType: string
  /** Extension for the primary source file (no leading dot). */
  sourceExtension: string
  source: string
}

/**
 * Shared contract for all mind-map outputs: transform canonical graph → diagram source.
 */
export interface MindMapVisualizer {
  readonly id: MindMapVisualizerId
  readonly label: string
  toDiagram(graph: WikiMapGraph): MindMapDiagramPayload
}
