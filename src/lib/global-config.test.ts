import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  findKnownKbByName,
  getGlobalConfigPath,
  hasConflictingKbName,
  readGlobalConfig,
  removeKnownKb,
  writeGlobalConfig,
} from './global-config.js'

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

  it('finds a saved KB by name case-insensitively', () => {
    const config = {
      activeKb: '/tmp/alpha',
      knownKbs: [
        { name: 'Alpha KB', path: '/tmp/alpha' },
        { name: 'Beta KB', path: '/tmp/beta' },
      ],
    }

    expect(findKnownKbByName(config, 'alpha kb')).toEqual({
      name: 'Alpha KB',
      path: '/tmp/alpha',
    })
  })

  it('throws when a saved KB name is ambiguous', () => {
    const config = {
      knownKbs: [
        { name: 'Research', path: '/tmp/research-a' },
        { name: 'research', path: '/tmp/research-b' },
      ],
    }

    expect(() => findKnownKbByName(config, 'research')).toThrow(
      'Saved KB name is ambiguous: "research". Matching paths: /tmp/research-a, /tmp/research-b',
    )
  })

  it('detects conflicting saved KB names case-insensitively', () => {
    const conflict = hasConflictingKbName(
      {
        knownKbs: [
          { name: 'Research KB', path: '/tmp/research-a' },
        ],
      },
      { name: 'research kb', path: '/tmp/research-b' },
    )

    expect(conflict).toEqual({
      name: 'Research KB',
      path: '/tmp/research-a',
    })
  })

  it('removes saved KBs by name and clears activeKb when needed', () => {
    const nextConfig = removeKnownKb(
      {
        activeKb: '/tmp/alpha',
        knownKbs: [
          { name: 'Alpha KB', path: '/tmp/alpha' },
          { name: 'Beta KB', path: '/tmp/beta' },
        ],
      },
      'Alpha KB',
    )

    expect(nextConfig).toEqual({
      activeKb: undefined,
      knownKbs: [{ name: 'Beta KB', path: '/tmp/beta' }],
    })
  })
})
