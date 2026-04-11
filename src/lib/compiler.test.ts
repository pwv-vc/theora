import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { llmMock } = vi.hoisted(() => ({
  llmMock: vi.fn(async () => '## Summary\n\nFresh body.\n\ntags: refreshed'),
}))

vi.mock('./llm.js', () => ({
  llm: llmMock,
  llmVision: vi.fn(),
  transcribeAudioFile: vi.fn(),
}))

vi.mock('./youtube.js', () => ({
  parseYouTubeTranscriptMarkdown: vi.fn(() => null),
  sanitizeExistingYouTubeTranscriptMarkdown: vi.fn((content: string) => content),
}))

import { compileTargetedSource, resolveRawSourceTarget } from './compiler.js'

const ORIGINAL_CWD = process.cwd()
const tempRoots: string[] = []

function createKbRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'theora-compile-'))
  tempRoots.push(root)

  mkdirSync(join(root, '.theora'), { recursive: true })
  mkdirSync(join(root, 'raw'), { recursive: true })
  mkdirSync(join(root, 'wiki', 'sources'), { recursive: true })
  mkdirSync(join(root, 'wiki', 'concepts'), { recursive: true })
  mkdirSync(join(root, 'output'), { recursive: true })

  writeFileSync(
    join(root, '.theora', 'config.json'),
    JSON.stringify({
      name: 'test-kb',
      created: '2026-01-01T00:00:00.000Z',
      provider: 'openai',
      model: 'gpt-4o',
      compileConcurrency: 3,
      conceptSummaryChars: 3000,
      conceptMin: 5,
      conceptMax: 10,
    }, null, 2) + '\n',
  )

  return root
}

describe('resolveRawSourceTarget', () => {
  beforeEach(() => {
    llmMock.mockClear()
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    while (tempRoots.length > 0) {
      rmSync(tempRoots.pop()!, { recursive: true, force: true })
    }
  })

  it('resolves a raw source by bare filename', () => {
    const root = createKbRoot()
    const nestedDir = join(root, 'raw', 'tag')
    mkdirSync(nestedDir, { recursive: true })
    const file = join(nestedDir, 'foo.md')
    writeFileSync(file, '# hello\n')
    process.chdir(root)

    expect(resolveRawSourceTarget(root, 'foo.md')).toBe(file)
  })

  it('resolves a raw source by relative path under raw', () => {
    const root = createKbRoot()
    const nestedDir = join(root, 'raw', 'tag')
    mkdirSync(nestedDir, { recursive: true })
    const file = join(nestedDir, 'foo.md')
    writeFileSync(file, '# hello\n')
    process.chdir(root)

    expect(resolveRawSourceTarget(root, 'tag/foo.md')).toBe(file)
  })

  it('rejects paths outside raw', () => {
    const root = createKbRoot()
    process.chdir(root)

    expect(() => resolveRawSourceTarget(root, '../../etc/passwd')).toThrow('Path traversal detected')
  })

  it('rejects unsupported source types', () => {
    const root = createKbRoot()
    const file = join(root, 'raw', 'blob.bin')
    writeFileSync(file, 'data')
    process.chdir(root)

    expect(() => resolveRawSourceTarget(root, 'blob.bin')).toThrow(
      'Unsupported source type for --source: blob.bin',
    )
  })

  it('rejects companion transcript raw files as direct targets', () => {
    const root = createKbRoot()
    const file = join(root, 'raw', 'episode.transcript.md')
    writeFileSync(file, '# transcript\n')
    process.chdir(root)

    expect(() => resolveRawSourceTarget(root, 'episode.transcript.md')).toThrow(
      'companion transcript',
    )
  })

  it('rejects generated video frame files as direct targets', () => {
    const root = createKbRoot()
    const framesDir = join(root, 'raw', 'clip.frames')
    mkdirSync(framesDir, { recursive: true })
    writeFileSync(join(framesDir, 'frame-001.jpg'), 'jpg')
    process.chdir(root)

    expect(() => resolveRawSourceTarget(root, 'clip.frames/frame-001.jpg')).toThrow(
      'generated video frame',
    )
  })
})

describe('compileTargetedSource', () => {
  beforeEach(() => {
    llmMock.mockClear()
  })

  afterEach(() => {
    process.chdir(ORIGINAL_CWD)
    while (tempRoots.length > 0) {
      rmSync(tempRoots.pop()!, { recursive: true, force: true })
    }
  })

  it('overwrites an existing source article for the selected raw file', async () => {
    const root = createKbRoot()
    const rawFile = join(root, 'raw', 'foo.md')
    const articleFile = join(root, 'wiki', 'sources', 'foo.md')

    writeFileSync(rawFile, '# Raw source\n\nNew content.\n')
    writeFileSync(articleFile, '---\ntitle: Old\n---\n\nOld body.\n')
    process.chdir(root)

    await compileTargetedSource(root, 'foo.md')

    const updated = readFileSync(articleFile, 'utf-8')
    expect(updated).toContain('Fresh body.')
    expect(updated).not.toContain('Old body.')
    expect(updated).toContain('source_file: foo.md')
    expect(llmMock).toHaveBeenCalledTimes(1)
  })
})
