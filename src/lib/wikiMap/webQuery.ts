import { ONTOLOGY_TYPES } from '../wiki.js'
import type { OntologyType } from '../wiki.js'

export function parseOntologyQueryParam(s: string | undefined): OntologyType | undefined {
  if (!s?.trim()) return undefined
  const t = s.trim().toLowerCase() as OntologyType
  return ONTOLOGY_TYPES.includes(t) ? t : undefined
}

export function parseWikiMapQuery(q: (name: string) => string | undefined): {
  aroundRaw: string
  tagRaw: string
  entityRaw: string
  ontologyRaw: string
  depth: number
  maxNodes: number
  bridgeCap: number
  error: string
} {
  const aroundRaw = q('around')?.trim() ?? ''
  const tagRaw = q('tag')?.trim() ?? ''
  const entityRaw = q('entity')?.trim() ?? ''
  const ontologyRaw = q('ontology')?.trim() ?? ''
  const depth = Math.min(8, Math.max(1, parseInt(q('depth') ?? '3', 10) || 3))
  const maxNodes = Math.min(500, Math.max(8, parseInt(q('maxNodes') ?? '200', 10) || 200))
  const bridgeCap = Math.min(50, Math.max(1, parseInt(q('bridgeCap') ?? '10', 10) || 10))

  let error = ''
  if (ontologyRaw && !parseOntologyQueryParam(ontologyRaw)) {
    error = `Invalid ontology. Use one of: ${ONTOLOGY_TYPES.join(', ')}.`
  }

  return { aroundRaw, tagRaw, entityRaw, ontologyRaw, depth, maxNodes, bridgeCap, error }
}
