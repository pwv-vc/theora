import type { MindMapVisualizer, MindMapVisualizerId } from '../mindMapVisualizer.js'
import { markmapMindMapVisualizer } from './markmapMindMapVisualizer.js'

const registry: Record<MindMapVisualizerId, MindMapVisualizer> = {
  markmap: markmapMindMapVisualizer,
}

export const DEFAULT_MIND_MAP_VISUALIZER_ID: MindMapVisualizerId = 'markmap'

export function listMindMapVisualizers(): MindMapVisualizer[] {
  return Object.values(registry)
}

export function getMindMapVisualizer(id: MindMapVisualizerId): MindMapVisualizer {
  const v = registry[id]
  if (!v) throw new Error(`Unknown mind map visualizer: ${id}`)
  return v
}

export function isMindMapVisualizerId(s: string): s is MindMapVisualizerId {
  return s in registry
}
