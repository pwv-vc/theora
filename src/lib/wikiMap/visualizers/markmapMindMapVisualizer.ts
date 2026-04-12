import type { WikiMapGraph } from '../graph.js'
import type { MindMapDiagramPayload, MindMapVisualizer } from '../mindMapVisualizer.js'

/** Escape characters that break markmap / markdown list lines. */
function escapeMdLine(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim()
}

/**
 * Nested markdown list from a BFS spanning tree rooted at the focal node.
 * Opens in VS Code (Markmap), https://markmap.js.org/repl, or any Markdown preview — no CLI browser.
 */
export function graphToMarkmapMarkdown(graph: WikiMapGraph): string {
  const byKey = new Map(graph.nodes.map((n) => [n.key, n]))
  const focal = graph.nodes.find((n) => n.kind === 'focal')
  if (!focal) {
    return '# Wiki map\n\n_(empty graph)_\n'
  }

  const adj = new Map<string, string[]>()
  for (const e of graph.edges) {
    if (!adj.has(e.fromKey)) adj.set(e.fromKey, [])
    if (!adj.has(e.toKey)) adj.set(e.toKey, [])
    adj.get(e.fromKey)!.push(e.toKey)
    adj.get(e.toKey)!.push(e.fromKey)
  }

  const parent = new Map<string, string>()
  const q: string[] = [focal.key]
  const visited = new Set<string>([focal.key])
  while (q.length) {
    const u = q.shift()!
    for (const v of adj.get(u) ?? []) {
      if (visited.has(v)) continue
      visited.add(v)
      parent.set(v, u)
      q.push(v)
    }
  }

  const children = new Map<string, string[]>()
  for (const [child, par] of parent) {
    if (!children.has(par)) children.set(par, [])
    children.get(par)!.push(child)
  }
  for (const [, arr] of children) {
    arr.sort((a, b) => (byKey.get(a)?.label ?? '').localeCompare(byKey.get(b)?.label ?? ''))
  }

  const lines: string[] = [`# ${escapeMdLine(focal.label)}`, '']

  function emitChild(key: string, depth: number): void {
    const node = byKey.get(key)
    if (!node) return
    const indent = '  '.repeat(depth)
    lines.push(`${indent}- ${escapeMdLine(node.label)}`)
    for (const c of children.get(key) ?? []) {
      emitChild(c, depth + 1)
    }
  }

  for (const c of children.get(focal.key) ?? []) {
    emitChild(c, 0)
  }

  lines.push('', '<!-- Markmap: open in VS Code / https://markmap.js.org/repl -->', '')
  return lines.join('\n')
}

export const markmapMindMapVisualizer: MindMapVisualizer = {
  id: 'markmap',
  label: 'Markmap (markdown list — no extra install)',
  toDiagram(graph: WikiMapGraph): MindMapDiagramPayload {
    return {
      visualizerId: 'markmap',
      diagramKind: 'markdown',
      mimeType: 'text/markdown',
      sourceExtension: 'md',
      source: graphToMarkmapMarkdown(graph),
    }
  },
}
