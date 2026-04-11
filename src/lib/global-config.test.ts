import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getGlobalConfigPath, readGlobalConfig, writeGlobalConfig } from './global-config.js'

const ORIGINAL_ENV = { ...process.env }

describe('global config', () => {
  let tempHome: string

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'theora-global-config-'))
    process.env = { ...ORIGINAL_ENV, HOME: tempHome }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    rmSync(tempHome, { recursive: true, force: true })
  })

  it('persists resolved active KB and saved KB paths', () => {
    writeGlobalConfig({
      activeKb: './research/main-kb',
      knownKbs: [
        { name: 'Main KB', path: './research/main-kb' },
      ],
    })

    expect(getGlobalConfigPath()).toBe(join(tempHome, '.theora', 'config.json'))
    expect(readGlobalConfig()).toEqual({
      activeKb: join(process.cwd(), 'research', 'main-kb'),
      knownKbs: [
        { name: 'Main KB', path: join(process.cwd(), 'research', 'main-kb') },
      ],
    })
  })

  it('deduplicates saved KBs by path', () => {
    const kbPath = join(tempHome, 'kb')

    writeGlobalConfig({
      activeKb: kbPath,
      knownKbs: [
        { name: 'KB A', path: kbPath },
        { name: 'KB B', path: kbPath },
      ],
    })

    expect(readGlobalConfig()).toEqual({
      activeKb: kbPath,
      knownKbs: [{ name: 'KB A', path: kbPath }],
    })
  })
})
