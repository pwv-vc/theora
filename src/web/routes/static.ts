import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import { requireKbRoot, kbPaths, safeJoin } from '../../lib/paths.js'
import { webStaticAssetsDir } from '../staticDir.js'

export const staticRoutes = new Hono()

staticRoutes.get('/static/styles.css', (c) => {
  const cssPath = join(webStaticAssetsDir(), 'styles.css')
  if (!existsSync(cssPath)) {
    return c.text('/* CSS not built — run pnpm build */', 200, { 'Content-Type': 'text/css' })
  }
  const css = readFileSync(cssPath, 'utf-8')
  return c.text(css, 200, { 'Content-Type': 'text/css; charset=utf-8' })
})

staticRoutes.get('/static/logo.svg', (c) => {
  const svgPath = join(webStaticAssetsDir(), 'logo.svg')
  if (!existsSync(svgPath)) return c.notFound()
  const svg = readFileSync(svgPath, 'utf-8')
  return c.text(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
})

/** Short URL for the wiki mind map (preserves query string). */
staticRoutes.get('/map', (c) => {
  try {
    const u = new URL(c.req.url)
    return c.redirect(`/wiki/map${u.search}`, 302)
  } catch {
    return c.redirect('/wiki/map', 302)
  }
})

staticRoutes.get('/raw/:filepath{.+}', (c) => {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const rawPath = c.req.param('filepath') ?? ''

  try {
    const filePath = safeJoin(paths.raw, rawPath)
    if (!existsSync(filePath)) return c.notFound()

    const stats = statSync(filePath)
    if (!stats.isFile()) return c.notFound()

    const ext = filePath.toLowerCase().split('.').pop() || ''
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'audio/ogg',
      'wav': 'audio/wav',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    const etag = `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`

    const ifNoneMatch = c.req.header('If-None-Match')
    if (ifNoneMatch === etag) {
      return c.body(null, 304)
    }

    const fileBuffer = readFileSync(filePath)
    return c.body(fileBuffer, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'ETag': etag,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('ENOENT')) {
        return c.notFound()
      }
      if (err.message.includes('EACCES') || err.message.includes('EPERM')) {
        return c.json({ error: 'Access denied' }, 403)
      }
    }
    return c.notFound()
  }
})
