import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { marked, Renderer } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { escapeHtml } from './utils.js'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'pre', 'details', 'summary',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'a': ['href', 'title', 'target', 'rel'],
    'code': ['class'],
    'div': ['class'],
    'span': ['class'],
    'pre': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

export function parseMarkdown(content: string): string {
  const renderer = new Renderer()
  const originalCode = renderer.code.bind(renderer)
  renderer.code = function (token) {
    if (token.lang === 'mermaid') {
      return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`
    }
    return originalCode(token)
  }
  const raw = marked.parse(content, { renderer }) as string
  return sanitizeHtml(raw, SANITIZE_OPTIONS)
}

export function normalizeHttpErrorStatus(status: unknown): number {
  const n = typeof status === 'number' && Number.isFinite(status) ? Math.trunc(status) : 500
  if (n >= 100 && n <= 599) return n
  return 500
}

/** Hono `c.html` rejects contentless status codes; map those to 500 for error bodies. */
export function toContentfulErrorStatus(status: number): ContentfulStatusCode {
  if (status === 101 || status === 204 || status === 205 || status === 304) return 500
  return status as ContentfulStatusCode
}
