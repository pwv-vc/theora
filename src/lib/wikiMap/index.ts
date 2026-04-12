/**
 * Wiki focal graph: canonical {@link WikiMapGraph} plus markmap visualization
 * and file emission. Web and CLI share the same graph; no headless Chrome.
 */
export type {
  WikiMapNodeKind,
  WikiMapNode,
  WikiMapEdge,
  WikiMapGraph,
  WikiMapCenter,
  WikiMapBuildOptions,
} from './graph.js'
export { buildWikiMapGraph, wikiMapGraphToJson, articleSlug } from './graph.js'

export type {
  MindMapDiagramPayload,
  MindMapVisualizer,
} from './mindMapVisualizer.js'

export {
  markmapMindMapVisualizer,
  graphToMarkmapMarkdown,
} from './visualizers/markmapMindMapVisualizer.js'

export type { EmitWikiMapArtifactsOptions, EmitWikiMapArtifactsResult } from './emitWikiMap.js'
export { emitWikiMapArtifacts } from './emitWikiMap.js'

export type { WikiMapWebGraphInput, WikiMapWebGraphOutput, EntityPill } from './mapWeb.js'
export { computeWikiMapWebGraph, collectEntityPills } from './mapWeb.js'
