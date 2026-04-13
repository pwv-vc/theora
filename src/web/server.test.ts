import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWebApp } from './server.js'

const ORIGINAL_CWD = process.cwd()

describe('createWebApp', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'theora-web-'))
    mkdirSync(join(tempRoot, '.theora'), { recursive: true })
    mkdirSync(join(tempRoot, 'raw'), { recursive: true })
    mkdirSync(join(tempRoot, 'wiki', 'sources'), { recursive: true })
    mkdirSync(join(tempRoot, 'wiki', 'concepts'), { recursive: true })
    mkdirSync(join(tempRoot, 'output'), { recursive: true })
    writeFileSync(
      join(tempRoot, '.theora', 'config.json'),
      JSON.stringify({
        name: 'Test KB',
        created: '2026-04-11T00:00:00.000Z',
        provider: 'openai',
        model: 'gpt-4o',
        compileConcurrency: 3,
        conceptSummaryChars: 3000,
        conceptMin: 5,
        conceptMax: 10,
      }, null, 2) + '\n',
    )
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('serves home, wiki map, ask, settings, and static CSS', async () => {
    const app = createWebApp()
    expect((await app.request('http://localhost/')).status).toBe(200)
    expect((await app.request('http://localhost/wiki/map')).status).toBe(200)
    expect((await app.request('http://localhost/ask')).status).toBe(200)
    const settingsRes = await app.request('http://localhost/settings')
    expect(settingsRes.status).toBe(200)

    const cssRes = await app.request('http://localhost/static/styles.css')
    expect(cssRes.status).toBe(200)
    expect(cssRes.headers.get('content-type')).toMatch(/text\/css/)
  })
})
