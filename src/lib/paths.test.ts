import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { writeGlobalConfig } from './global-config.js'
import { findActiveKbRoot, findKbRoot, requireKbRoot, resolveKbRoot } from './paths.js'

const ORIGINAL_ENV = { ...process.env }
const ORIGINAL_CWD = process.cwd()

function createKb(root: string, name: string): void {
  mkdirSync(join(root, '.theora'), { recursive: true })
  mkdirSync(join(root, 'raw'), { recursive: true })
  mkdirSync(join(root, 'wiki'), { recursive: true })
  mkdirSync(join(root, 'output'), { recursive: true })
  writeFileSync(
    join(root, '.theora', 'config.json'),
    JSON.stringify({
      name,
      created: '2026-04-11T00:00:00.000Z',
      provider: 'openai',
      model: 'gpt-4o',
      compileConcurrency: 3,
      conceptSummaryChars: 3000,
      conceptMin: 5,
      conceptMax: 10,
    }, null, 2) + '\n',
  )
}

describe('KB path resolution', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'theora-paths-'))
    process.env = { ...ORIGINAL_ENV, HOME: tempRoot }
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    process.env = { ...ORIGINAL_ENV }
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('prefers the nearest KB from the current working directory', () => {
    const localKb = join(tempRoot, 'local-kb')
    const nestedDir = join(localKb, 'notes', 'nested')
    const globalKb = join(tempRoot, 'global-kb')

    createKb(localKb, 'Local KB')
    createKb(globalKb, 'Global KB')
    mkdirSync(nestedDir, { recursive: true })

    writeGlobalConfig({
      activeKb: globalKb,
      knownKbs: [{ name: 'Global KB', path: globalKb }],
    })

    process.chdir(nestedDir)

    expect(findKbRoot()).toBe(realpathSync(localKb))
    expect(findActiveKbRoot()).toBe(realpathSync(localKb))
    expect(resolveKbRoot()).toEqual({
      root: realpathSync(localKb),
      source: 'cwd',
      invalidGlobalKb: null,
    })
  })

  it('falls back to the global active KB outside a knowledge base', () => {
    const globalKb = join(tempRoot, 'global-kb')
    const outsideDir = join(tempRoot, 'outside')

    createKb(globalKb, 'Global KB')
    mkdirSync(outsideDir, { recursive: true })
    writeGlobalConfig({
      activeKb: globalKb,
      knownKbs: [{ name: 'Global KB', path: globalKb }],
    })

    process.chdir(outsideDir)

    expect(findKbRoot()).toBeNull()
    expect(findActiveKbRoot()).toBe(resolve(globalKb))
    expect(requireKbRoot()).toBe(resolve(globalKb))
    expect(resolveKbRoot()).toEqual({
      root: resolve(globalKb),
      source: 'global',
      invalidGlobalKb: null,
    })
  })

  it('reports invalid global active KB paths clearly', () => {
    const missingKb = join(tempRoot, 'missing-kb')
    const outsideDir = join(tempRoot, 'outside')

    mkdirSync(outsideDir, { recursive: true })
    writeGlobalConfig({
      activeKb: missingKb,
      knownKbs: [{ name: 'Missing KB', path: missingKb }],
    })

    process.chdir(outsideDir)

    expect(resolveKbRoot()).toEqual({
      root: null,
      source: 'none',
      invalidGlobalKb: resolve(missingKb),
    })
    expect(() => requireKbRoot()).toThrow(
      `Configured active KB is invalid: "${resolve(missingKb)}". Run \`theora kb use <path>\` to set a valid knowledge base.`,
    )
  })
})
