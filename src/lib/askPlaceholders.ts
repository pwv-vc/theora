import { listWikiArticles } from './wiki.js'

type IntroFn = (subject: string) => string

const FALLBACK_PHRASES = [
  'Tell me about this knowledge base',
  'What is this wiki about?',
  'Explain what this knowledge base covers',
] as const

function humanizeSlug(slug: string): string {
  const s = slug.includes('/') ? slug.split('/').pop() ?? slug : slug
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function ontologyList(fm: Record<string, unknown>): string[] {
  const raw = fm.ontology
  if (Array.isArray(raw)) return raw.map((x) => String(x).toLowerCase())
  if (typeof raw === 'string') return [raw.toLowerCase()]
  return []
}

/**
 * Concept articles: use ontology when present; abstract concepts rotate
 * Explain vs What is.
 */
function introForConceptArticle(fm: Record<string, unknown>): IntroFn {
  const o = ontologyList(fm)

  if (o.includes('person')) return (s) => `Who is ${s}?`
  if (o.includes('place')) return (s) => `Where is ${s}?`
  if (o.includes('organization')) return (s) => `What does ${s} do?`
  if (o.includes('product')) return (s) => `What is ${s}?`
  if (o.includes('event')) return (s) => `Tell me about ${s}`
  if (o.includes('technology')) return (s) => `How does ${s} work?`
  if (o.includes('creative-work')) return (s) => `What is ${s}?`

  return Math.random() < 0.5
    ? (s) => `Explain ${s}`
    : (s) => `What is ${s}?`
}

/** Source-article entity buckets from compile prompts. */
function introForEntityCategory(category: string): IntroFn | null {
  const c = category.toLowerCase()

  if (c === 'dates') return null

  if (c === 'people' || c === 'person') return (s) => `Who is ${s}?`
  if (c === 'places' || c === 'place' || c === 'locations' || c === 'location')
    return (s) => `Where is ${s}?`
  if (
    c === 'organizations' ||
    c === 'organization' ||
    c === 'companies' ||
    c === 'company'
  )
    return (s) => `What does ${s} do?`
  if (c === 'products' || c === 'product') return (s) => `What is ${s}?`
  if (c === 'events' || c === 'event') return (s) => `Tell me about ${s}`

  if (c.includes('tech')) return (s) => `How does ${s} work?`

  return (s) => `Tell me about ${s}`
}

interface PlaceholderEntry {
  subject: string
  intro: IntroFn
}

/**
 * Builds ask placeholder strings from concept titles (with ontology-aware intros)
 * and named entities (with category-aware intros).
 */
export function buildAskPlaceholderPhrases(): string[] {
  const articles = listWikiArticles()
  const entries: PlaceholderEntry[] = []
  const seenSubject = new Set<string>()

  function pushEntry(subject: string, intro: IntroFn): void {
    const t = subject.trim()
    if (t.length === 0 || t.length > 200) return
    const key = t.toLowerCase()
    if (seenSubject.has(key)) return
    seenSubject.add(key)
    entries.push({ subject: t, intro })
  }

  for (const a of articles) {
    const rel = a.relativePath.replace(/\\/g, '/')
    if (!rel.startsWith('wiki/concepts/')) continue
    const title = a.title.trim()
    if (!title) continue
    pushEntry(title, introForConceptArticle(a.frontmatter))
  }

  for (const a of articles) {
    if (!a.entities) continue
    for (const [category, names] of Object.entries(a.entities)) {
      const intro = introForEntityCategory(category)
      if (!intro) continue
      if (!Array.isArray(names)) continue
      for (const raw of names) {
        const display = humanizeSlug(String(raw))
        if (display) pushEntry(display, intro)
      }
    }
  }

  if (entries.length === 0) {
    return [FALLBACK_PHRASES[Math.floor(Math.random() * FALLBACK_PHRASES.length)]]
  }

  shuffleInPlace(entries)

  const n = entries.length
  const minTake = Math.min(5, n)
  const maxTake = Math.min(20, n)
  const span = maxTake - minTake + 1
  const take = minTake + Math.floor(Math.random() * span)

  return entries.slice(0, take).map(({ subject, intro }) => {
    const phrase = intro(subject)
    return phrase.length > 280 ? phrase.slice(0, 277) + '…' : phrase
  })
}
