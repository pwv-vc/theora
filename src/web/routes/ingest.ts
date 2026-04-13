import { mkdirSync } from 'node:fs'
import { Hono } from 'hono'
import type { AppVariables } from '../middleware/context.js'
import { requireKbRoot, kbPaths, safeJoin } from '../../lib/paths.js'
import { getAllTagsWithCounts } from '../../lib/wiki.js'
import { readManifest, writeManifest } from '../../lib/manifest.js'
import { ingestWebFile, ingestWebUrl } from '../../lib/ingest.js'
import { Layout } from '../pages/layout.js'
import { IngestPage } from '../pages/ingest.js'

export const ingestRoutes = new Hono<{ Variables: AppVariables }>()

ingestRoutes.get('/', (c) => {
  const tagsWithCounts = getAllTagsWithCounts()
  const config = c.get('config')

  return c.html(
    Layout({
      title: 'Ingest',
      active: 'ingest',
      children: IngestPage({ tagsWithCounts, config }),
    }).toString(),
  )
})

ingestRoutes.post('/upload', async (c) => {
  const root = requireKbRoot()
  const paths = kbPaths(root)
  const body = await c.req.parseBody({ all: true })

  const tag = typeof body['tag'] === 'string' ? body['tag'].trim() || null : null
  if (tag && !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
    return c.json({ error: 'Invalid tag — use lowercase letters, numbers, and hyphens only' }, 400)
  }
  const destDir = tag ? safeJoin(paths.raw, tag) : paths.raw
  mkdirSync(destDir, { recursive: true })

  const entries = readManifest()
  const existingNames = new Set(entries.map(e => e.name))
  const existingUrls = new Set(entries.flatMap(e => e.url ? [e.url] : []))

  const ingestedEntries: { name: string; tag: string | null; url?: string }[] = []
  const errors: string[] = []
  const ingestedNames: string[] = []

  const rawFiles = body['files']
  const fileList = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : []
  for (const f of fileList) {
    if (f instanceof File) {
      const result = await ingestWebFile(f, destDir, existingNames)
      if (result.status === 'ingested') {
        ingestedEntries.push({ name: result.name, tag })
        ingestedNames.push(result.name)
      } else if (result.status === 'error' || result.status === 'skipped_type' || result.status === 'skipped_size') {
        if (result.error) errors.push(result.error)
      }
    }
  }

  const urlsRaw = typeof body['urls'] === 'string' ? body['urls'] : ''
  const urls = urlsRaw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
  for (const url of urls) {
    const result = await ingestWebUrl(url, destDir, existingNames, existingUrls)
    if (result.status === 'ingested') {
      ingestedEntries.push({ name: result.name, tag, url: result.url ?? url })
      ingestedNames.push(result.name)
    } else if (result.status === 'error') {
      if (result.error) errors.push(result.error)
    }
  }

  if (ingestedEntries.length > 0) {
    const now = new Date().toISOString()
    for (const entry of ingestedEntries) {
      entries.push({ name: entry.name, ingested: now, tag: entry.tag, url: entry.url })
    }
    writeManifest(entries)
  }

  return c.json({
    ingested: ingestedNames.length,
    skipped: fileList.filter(f => f instanceof File).length + urls.length - ingestedNames.length - errors.length,
    files: ingestedNames,
    errors,
  })
})
