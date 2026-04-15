import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  compileSourcesMock,
  compileTargetedSourceMock,
  extractConceptsMock,
  rebuildIndexMock,
} = vi.hoisted(() => ({
  compileSourcesMock: vi.fn(),
  compileTargetedSourceMock: vi.fn(),
  extractConceptsMock: vi.fn(),
  rebuildIndexMock: vi.fn(),
}))

vi.mock('./wiki-compiler.js', () => ({
  compileSources: compileSourcesMock,
  compileTargetedSource: compileTargetedSourceMock,
  extractConcepts: extractConceptsMock,
  rebuildIndex: rebuildIndexMock,
}))

import { runCompile } from './run.js'

describe('runCompile targeted source mode', () => {
  const root = '/tmp/theora-test'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects --source with --force', async () => {
    await expect(runCompile(root, { source: 'foo.md', force: true })).rejects.toThrow(
      '--source cannot be used with --force',
    )
  })

  it('rejects --source with --concepts-only', async () => {
    await expect(runCompile(root, { source: 'foo.md', conceptsOnly: true })).rejects.toThrow(
      '--source cannot be used with --concepts-only',
    )
  })

  it('rejects --source with --reindex', async () => {
    await expect(runCompile(root, { source: 'foo.md', reindex: true })).rejects.toThrow(
      '--source cannot be used with --reindex',
    )
  })

  it('compiles one source, rebuilds the index, and skips concepts', async () => {
    await runCompile(root, { source: 'foo.md' })

    expect(compileTargetedSourceMock).toHaveBeenCalledWith(root, 'foo.md', undefined, undefined)
    expect(rebuildIndexMock).toHaveBeenCalledWith(root, undefined)
    expect(compileSourcesMock).not.toHaveBeenCalled()
    expect(extractConceptsMock).not.toHaveBeenCalled()
    expect(compileTargetedSourceMock.mock.invocationCallOrder[0]).toBeLessThan(
      rebuildIndexMock.mock.invocationCallOrder[0],
    )
  })
})
