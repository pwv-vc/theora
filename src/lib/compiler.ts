import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename, dirname, extname, relative, sep } from 'node:path'
import ora from 'ora'
import pLimit from 'p-limit'
import pc from 'picocolors'
import { normalizeLinks } from './wiki.js'
import { PDFParse } from 'pdf-parse'
import { kbPaths } from './paths.js'
import { llm, llmVision, transcribeAudioFile } from './llm.js'
import type { ImageInput } from './llm.js'
import { listRawFiles, listWikiArticles, writeArticle, sanitizeLlmOutput, readWikiIndex, getWikiStats, ONTOLOGY_TYPES, ONTOLOGY_SCHEMA_URLS } from './wiki.js'
import type { ArticleMeta, OntologyType } from './wiki.js'
import { getTagForFile } from './manifest.js'
import { slugify, titleFromFilename, normalizeTag } from './utils.js'
import { readConfig } from './config.js'
import {
  COMPILE_SYSTEM,
  buildSourcePrompt,
  buildPdfPrompt,
  buildImagePrompt,
  buildAudioPrompt,
  buildVideoPrompt,
  buildVideoFramePrompt,
} from './prompts/compile.js'
import { hasFfmpeg } from './deps.js'
import {
  computeFrameSchedule,
  extractAudioForWhisper,
  extractVisionFramesJpeg,
  formatTimecode,
  getFfprobeDurationSeconds,
  hasFfprobe,
  hasMediaAudioStream,
} from './media-ffmpeg.js'
import { CONCEPT_SYSTEM, buildConceptPrompt } from './prompts/concept.js'

// --- File classification ---

const TEXT_EXTS = new Set(['.md', '.mdx', '.txt', '.html', '.json', '.csv', '.xml', '.yaml', '.yml'])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const PDF_EXTS = new Set(['.pdf'])
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a'])
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm'])

type FileKind = 'text' | 'image' | 'pdf' | 'audio' | 'video' | 'unknown'

function classifyFile(path: string): FileKind {
  const ext = extname(path).toLowerCase()
  if (TEXT_EXTS.has(ext)) return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (PDF_EXTS.has(ext)) return 'pdf'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (VIDEO_EXTS.has(ext)) return 'video'
  return 'unknown'
}

const MEDIA_TYPES: Record<string, ImageInput['mediaType']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

function mergeTags(ingestTag: string | null, llmTags: string[]): string[] {
  const set = new Set(llmTags.map(t => normalizeTag(t)))
  if (ingestTag) set.add(normalizeTag(ingestTag))
  return [...set].sort()
}

function getExistingSourceSlugs(root: string): Set<string> {
  const paths = kbPaths(root)
  return new Set(
    listWikiArticles()
      .filter(a => a.path.startsWith(paths.wikiSources))
      .map(a => basename(a.path, '.md')),
  )
}

// --- File compilers ---

async function compileTextFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)

  const content = readFileSync(file, 'utf-8').slice(0, 50000)
  const ext = extname(file).toLowerCase().slice(1)
  const raw = await llm(buildSourcePrompt(basename(file), content, ingestTag), { system: COMPILE_SYSTEM, maxTokens: 4096, action: 'compile', meta: ext })
  const { body, tags, entities } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'text',
    tags: mergeTags(ingestTag, tags),
    entities,
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

async function compilePdfFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)

  const buffer = readFileSync(file)
  let text: string
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text
    parser.destroy()
  } catch {
    return
  }

  const raw = await llm(buildPdfPrompt(basename(file), text.slice(0, 50000), ingestTag), { system: COMPILE_SYSTEM, maxTokens: 4096, action: 'compile', meta: 'pdf' })
  const { body, tags, entities } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'pdf',
    tags: mergeTags(ingestTag, tags),
    entities,
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

async function compileImageFile(file: string, paths: ReturnType<typeof kbPaths>, ingestTag: string | null): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)
  const ext = extname(file).toLowerCase()

  const mediaType = MEDIA_TYPES[ext]
  if (!mediaType) return

  const base64 = readFileSync(file).toString('base64')
  const relImg = relative(join(paths.root, 'wiki', 'sources'), file).split(sep).join('/')
  const imageRef = relImg.includes(' ') ? `![${name}](<${relImg}>)` : `![${name}](${relImg})`

  const raw = await llmVision(
    buildImagePrompt(basename(file), imageRef, ingestTag),
    [{ base64, mediaType }],
    { system: 'You are a knowledge base compiler analyzing images. Describe what you see in detail and extract all useful information.', maxTokens: 4096, action: 'vision' },
  )
  const { body, tags, entities } = sanitizeLlmOutput(raw)

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'image',
    tags: mergeTags(ingestTag, tags),
    entities,
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, body)
}

/** Written next to video/audio during compile; verbatim wiki is emitted in the same pass — do not compile via LLM again. */
function isCompanionTranscriptRaw(filePath: string): boolean {
  return basename(filePath).toLowerCase().endsWith('.transcript.md')
}

/** Preview JPEGs live under `raw/.../{stem}.frames/` — not standalone sources. */
function isRawVideoExtractedFramePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.split('/').some(seg => seg.endsWith('.frames'))
}

function buildVideoFrameGridMarkdown(
  frames: { path: string; timeSec: number }[],
  wikiSourcesDir: string,
): string {
  if (frames.length === 0) return ''
  const cols = 3
  const lines: string[] = [
    '## Sample frames',
    '',
    '_Preview JPEGs extracted for this compile (representative times; see `source_file` for the video)._',
    '',
  ]
  lines.push(`|${'     |'.repeat(cols)}`)
  lines.push(`|${' :---: |'.repeat(cols)}`)
  for (let r = 0; r < frames.length; r += cols) {
    const cells: string[] = []
    for (let c = 0; c < cols; c++) {
      const idx = r + c
      if (idx < frames.length) {
        const fr = frames[idx]!
        const rel = relative(wikiSourcesDir, fr.path).split(sep).join('/')
        const tc = formatTimecode(fr.timeSec)
        // Angle brackets required: marked/Obsidian stop unquoted URLs at the first space.
        cells.push(`![${tc}](<${rel}>)`)
      } else {
        cells.push(' ')
      }
    }
    lines.push(`|${cells.join('|')}|`)
  }
  lines.push('')
  return lines.join('\n')
}

function formatCompanionTranscriptMarkdown(
  mediaBasename: string,
  mainArticleSlug: string,
  transcript: string,
  mediaKind: 'video' | 'audio',
): string {
  return [
    `# Transcript (Whisper)`,
    '',
    `Companion ${mediaKind} source: \`${mediaBasename}\``,
    '',
    `Wiki article: [[${mainArticleSlug}]]`,
    '',
    '_Automated transcription; may contain errors._',
    '',
    '## Full transcript',
    '',
    transcript.trimEnd(),
    '',
  ].join('\n')
}

function ffmpegInstallHint(): string {
  return process.platform === 'darwin'
    ? ' Install with Homebrew: brew install ffmpeg (https://brew.sh)'
    : ' Install ffmpeg (e.g. sudo apt install ffmpeg or sudo dnf install ffmpeg).'
}

async function compileAudioFile(
  file: string,
  paths: ReturnType<typeof kbPaths>,
  ingestTag: string | null,
  onStep?: (step: string) => void,
): Promise<void> {
  const name = basename(file, extname(file))
  const slug = slugify(name)
  const ext = extname(file).toLowerCase().slice(1)
  const cfg = readConfig()

  let pathForWhisper = file
  let cleanup: (() => void) | null = null

  if (cfg.whisperPreprocessAudio && hasFfmpeg()) {
    onStep?.('Normalizing audio for Whisper (ffmpeg)')
    try {
      const tmpDir = mkdtempSync(join(tmpdir(), 'theora-whisper-'))
      const wav = join(tmpDir, 'whisper.wav')
      await extractAudioForWhisper(file, wav, cfg)
      pathForWhisper = wav
      cleanup = () => rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      onStep?.('Preprocess skipped — using original file for Whisper')
      console.warn(
        pc.yellow(`Preprocess skipped for ${basename(file)} — ffmpeg failed; sending original to Whisper.`),
      )
    }
  }

  onStep?.('Transcribing audio (Whisper)')
  let transcript = ''
  try {
    transcript = await transcribeAudioFile(pathForWhisper, { action: 'transcribe', meta: ext })
  } finally {
    cleanup?.()
  }

  const cap = cfg.compileMediaTranscriptMaxChars ?? 50000
  transcript = transcript.slice(0, cap)

  onStep?.('Writing wiki article from transcript (LLM)')
  const raw = await llm(buildAudioPrompt(basename(file), transcript, ingestTag), {
    system: COMPILE_SYSTEM,
    maxTokens: 4096,
    action: 'compile',
    meta: 'audio',
  })
  const { body, tags, entities } = sanitizeLlmOutput(raw)

  const hasTranscriptArtifact = transcript.trim().length > 0
  let bodyOut = body.trimEnd()
  let related: string[] | undefined

  if (hasTranscriptArtifact) {
    const transcriptSlug = slugify(`${name}.transcript`)
    const transcriptAbs = join(dirname(file), `${name}.transcript.md`)
    const transcriptMd = formatCompanionTranscriptMarkdown(basename(file), slug, transcript, 'audio')
    writeFileSync(transcriptAbs, transcriptMd, 'utf-8')

    const transcriptMeta: ArticleMeta = {
      title: `Transcript: ${titleFromFilename(file)}`,
      type: 'source',
      sourceFile: relative(paths.raw, transcriptAbs),
      sourceType: 'text',
      tags: mergeTags(ingestTag, ['transcript']),
      relatedSources: [slug],
    }
    writeArticle(join(paths.wikiSources, `${transcriptSlug}.md`), transcriptMeta, transcriptMd)

    bodyOut += `\n\n---\n\n**Transcript:** [[${transcriptSlug}]] (verbatim Whisper)\n`
    related = [transcriptSlug]
  }

  const meta: ArticleMeta = {
    title: titleFromFilename(file),
    type: 'source',
    sourceFile: relative(paths.raw, file),
    sourceType: 'audio',
    tags: mergeTags(ingestTag, tags),
    entities,
    relatedSources: related,
  }

  writeArticle(join(paths.wikiSources, `${slug}.md`), meta, bodyOut)
}

async function compileVideoFile(
  file: string,
  paths: ReturnType<typeof kbPaths>,
  ingestTag: string | null,
  onStep?: (step: string) => void,
): Promise<void> {
  if (!hasFfmpeg()) {
    console.error(pc.red(`Skipping ${basename(file)}: ffmpeg not found.${ffmpegInstallHint()}`))
    return
  }

  const name = basename(file, extname(file))
  const slug = slugify(name)
  const cfg = readConfig()
  const tmpDir = mkdtempSync(join(tmpdir(), 'theora-video-'))

  try {
    const wav = join(tmpDir, 'audio.wav')
    const cap = cfg.compileMediaTranscriptMaxChars ?? 50000
    let transcript = ''

    const noAudioMsg = () => {
      onStep?.('No audio track — using frame analysis only')
      console.warn(
        pc.yellow(`No audio in ${basename(file)} — compiling from sampled frames only (no transcript).`),
      )
    }

    const onTranscribeFail = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('ffmpeg') || msg.includes('Command failed')) {
        noAudioMsg()
      } else {
        onStep?.('Transcription failed — using frame analysis only')
        console.warn(
          pc.yellow(`Transcription failed for ${basename(file)} — using sampled frames only (no transcript).`),
        )
      }
    }

    if (hasFfprobe()) {
      const withAudio = await hasMediaAudioStream(file)
      if (!withAudio) {
        noAudioMsg()
      } else {
        onStep?.('Extracting audio (ffmpeg)')
        try {
          await extractAudioForWhisper(file, wav, cfg)
          onStep?.('Transcribing audio (Whisper)')
          transcript = (await transcribeAudioFile(wav, { action: 'transcribe', meta: 'video' })).slice(0, cap)
        } catch (err) {
          onTranscribeFail(err)
          transcript = ''
        }
      }
    } else {
      onStep?.('Extracting audio (ffmpeg)')
      try {
        await extractAudioForWhisper(file, wav, cfg)
        onStep?.('Transcribing audio (Whisper)')
        transcript = (await transcribeAudioFile(wav, { action: 'transcribe', meta: 'video' })).slice(0, cap)
      } catch (err) {
        onTranscribeFail(err)
        transcript = ''
      }
    }

    const hasTranscriptArtifact = transcript.trim().length > 0

    onStep?.('Reading duration & planning frame samples (ffprobe)')
    const durationSec = await getFfprobeDurationSeconds(file)
    const times = computeFrameSchedule(durationSec, cfg)
    const framesTmp = await extractVisionFramesJpeg(file, tmpDir, times, cfg, (i, total) =>
      onStep?.(`Extracting preview frames (ffmpeg): ${i}/${total}`),
    )

    const framesDir = join(dirname(file), `${name}.frames`)
    rmSync(framesDir, { recursive: true, force: true })
    mkdirSync(framesDir, { recursive: true })
    const persistFrames: { path: string; timeSec: number }[] = []
    for (const fr of framesTmp) {
      const dest = join(framesDir, basename(fr.path))
      copyFileSync(fr.path, dest)
      persistFrames.push({ path: dest, timeSec: fr.timeSec })
    }

    const frameAnalyses: { time: string; text: string }[] = []
    const nFrames = persistFrames.length
    for (let fi = 0; fi < persistFrames.length; fi++) {
      const { path: framePath, timeSec } = persistFrames[fi]!
      onStep?.(`Analyzing frames with vision (LLM): ${fi + 1}/${nFrames} @ ${formatTimecode(timeSec)}`)
      try {
        const base64 = readFileSync(framePath).toString('base64')
        const rawFrame = await llmVision(
          buildVideoFramePrompt(formatTimecode(timeSec), basename(file)),
          [{ base64, mediaType: 'image/jpeg' }],
          {
            system: 'You are a knowledge base compiler analyzing video frames.',
            maxTokens: 2048,
            action: 'vision',
            meta: 'video-frame',
          },
        )
        frameAnalyses.push({ time: formatTimecode(timeSec), text: rawFrame.trim() })
      } catch {
        // omit failed frame
      }
    }

    onStep?.(
      hasTranscriptArtifact
        ? 'Merging transcript + frames into wiki article (LLM)'
        : 'Merging frame analysis into wiki article (LLM)',
    )
    const raw = await llm(buildVideoPrompt(basename(file), transcript, frameAnalyses, ingestTag), {
      system: COMPILE_SYSTEM,
      maxTokens: 4096,
      action: 'compile',
      meta: 'video',
    })
    const { body, tags, entities } = sanitizeLlmOutput(raw)

    const frameSection = buildVideoFrameGridMarkdown(persistFrames, paths.wikiSources)

    let bodyTail = `${body.trimEnd()}\n\n${frameSection}`
    let related: string[] | undefined

    if (hasTranscriptArtifact) {
      const transcriptStem = `${name}.transcript`
      const transcriptSlug = slugify(transcriptStem)
      const transcriptAbs = join(dirname(file), `${name}.transcript.md`)
      const transcriptMd = formatCompanionTranscriptMarkdown(basename(file), slug, transcript, 'video')
      writeFileSync(transcriptAbs, transcriptMd, 'utf-8')

      const transcriptTitle = `Transcript: ${titleFromFilename(file)}`
      const transcriptMeta: ArticleMeta = {
        title: transcriptTitle,
        type: 'source',
        sourceFile: relative(paths.raw, transcriptAbs),
        sourceType: 'text',
        tags: mergeTags(ingestTag, ['transcript']),
        relatedSources: [slug],
      }
      writeArticle(join(paths.wikiSources, `${transcriptSlug}.md`), transcriptMeta, transcriptMd)

      bodyTail += `\n---\n\n**Transcript:** [[${transcriptSlug}]] (verbatim Whisper)\n`
      related = [transcriptSlug]
    }

    const meta: ArticleMeta = {
      title: titleFromFilename(file),
      type: 'source',
      sourceFile: relative(paths.raw, file),
      sourceType: 'video',
      tags: mergeTags(ingestTag, tags),
      entities,
      relatedSources: related,
    }

    writeArticle(join(paths.wikiSources, `${slug}.md`), meta, bodyTail)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

// --- Pipeline stages ---

export async function compileSources(root: string, concurrency?: number, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const rawFiles = listRawFiles()
  const existingSlugs = getExistingSourceSlugs(root)

  const newFiles = rawFiles.filter(f => {
    if (isCompanionTranscriptRaw(f)) return false
    if (isRawVideoExtractedFramePath(f)) return false
    const kind = classifyFile(f)
    if (kind === 'unknown') return false
    return !existingSlugs.has(slugify(basename(f, extname(f))))
  })

  if (newFiles.length === 0) {
    console.log('All sources already compiled. Nothing new to process.')
    return
  }

  const byKind = { text: 0, image: 0, pdf: 0, audio: 0, video: 0 }
  for (const f of newFiles) {
    const kind = classifyFile(f)
    if (kind !== 'unknown') byKind[kind]++
  }

  const parts = []
  if (byKind.text > 0) parts.push(`${byKind.text} text`)
  if (byKind.pdf > 0) parts.push(`${byKind.pdf} PDF`)
  if (byKind.image > 0) parts.push(`${byKind.image} image`)
  if (byKind.audio > 0) parts.push(`${byKind.audio} audio`)
  if (byKind.video > 0) parts.push(`${byKind.video} video`)
  console.log(`Found ${newFiles.length} new source${newFiles.length !== 1 ? 's' : ''} to compile (${parts.join(', ')})`)

  const { compileConcurrency } = readConfig()
  const limit = pLimit(concurrency ?? compileConcurrency)

  let done = 0
  const inFlight = new Set<string>()
  const sourceStepByName = new Map<string, string>()
  const stepBaseByName = new Map<string, string>()
  const stepTickByName = new Map<string, ReturnType<typeof setInterval>>()
  const spinner = onProgress ? null : ora(`Compiling sources [0/${newFiles.length}]`).start()

  const clearStepTick = (fileBasename: string) => {
    const id = stepTickByName.get(fileBasename)
    if (id !== undefined) {
      clearInterval(id)
      stepTickByName.delete(fileBasename)
    }
    stepBaseByName.delete(fileBasename)
  }

  const updateSpinner = () => {
    const header = `Compiling sources [${done}/${newFiles.length}]`
    const names = [...inFlight]
    if (onProgress) {
      const files = names.join(', ')
      onProgress(`${header}${files ? ` → ${files}` : ''}`)
    } else if (spinner) {
      const arrowLine =
        names.length === 0
          ? ''
          : `\n  ${pc.gray('→')} ${names.map(f => pc.cyan(f)).join(pc.gray(', '))}`
      const stepLines = names
        .map(n => {
          const s = sourceStepByName.get(n)
          return s ? `\n    ${pc.dim(s)}` : ''
        })
        .join('')
      spinner.text = `${header}${arrowLine}${stepLines}`
    }
  }

  const emitSourceStep = (fileBasename: string, step: string) => {
    clearStepTick(fileBasename)
    stepBaseByName.set(fileBasename, step)
    sourceStepByName.set(fileBasename, step)
    onProgress?.(`  · ${fileBasename}: ${step}`)
    if (spinner) updateSpinner()

    const started = Date.now()
    let lastWebPulse = 0
    const id = setInterval(() => {
      const base = stepBaseByName.get(fileBasename)
      if (!base) return
      const sec = Math.max(1, Math.floor((Date.now() - started) / 1000))
      const withElapsed = `${base} · ${sec}s`
      sourceStepByName.set(fileBasename, withElapsed)
      if (spinner) updateSpinner()
      if (onProgress) {
        const now = Date.now()
        if (sec >= 3 && now - lastWebPulse >= 5000) {
          lastWebPulse = now
          onProgress(`  · ${fileBasename}: ${withElapsed}`)
        }
      }
    }, 1000)
    stepTickByName.set(fileBasename, id)
  }

  await Promise.all(
    newFiles.map(file =>
      limit(async () => {
        const name = basename(file)
        inFlight.add(name)
        updateSpinner()

        const ingestTag = getTagForFile(name)
        try {
          switch (classifyFile(file)) {
            case 'text': await compileTextFile(file, paths, ingestTag); break
            case 'pdf': await compilePdfFile(file, paths, ingestTag); break
            case 'image': await compileImageFile(file, paths, ingestTag); break
            case 'audio':
              await compileAudioFile(file, paths, ingestTag, step => emitSourceStep(name, step))
              break
            case 'video':
              await compileVideoFile(file, paths, ingestTag, step => emitSourceStep(name, step))
              break
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(pc.red(`Compile failed for ${name}: ${msg}`))
        } finally {
          clearStepTick(name)
          sourceStepByName.delete(name)
          inFlight.delete(name)
          done++
          updateSpinner()
        }
      })
    )
  )

  if (spinner) {
    spinner.succeed(`Compiled ${newFiles.length} source${newFiles.length !== 1 ? 's' : ''}`)
  } else {
    onProgress?.(`✓ Compiled ${newFiles.length} source${newFiles.length !== 1 ? 's' : ''}`)
  }
}

export async function extractConcepts(root: string, concurrency?: number, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const sourceArticles = listWikiArticles().filter(a => a.path.startsWith(paths.wikiSources))
  if (sourceArticles.length === 0) return

  const spinner = onProgress ? null : ora('Extracting concepts').start()
  onProgress?.('Extracting concepts...')

  const { compileConcurrency: defaultConcurrency, conceptSummaryChars, conceptMin, conceptMax } = readConfig()

  const summaries = sourceArticles
    .map(a => `### ${a.title}\n${a.content.slice(0, conceptSummaryChars)}`)
    .join('\n\n')

  const conceptsRaw = await llm(
    `Review these wiki source summaries and identify the key concepts that deserve their own articles.

${summaries}

Return a JSON array of objects with:
- "slug": kebab-case filename
- "title": human-readable title
- "description": one-sentence description
- "related_sources": array of source slugs that mention this concept
- "ontology": array of schema.org-aligned types that apply to this concept — pick one or more:
${ONTOLOGY_TYPES.map(t => `  "${t}" (${ONTOLOGY_SCHEMA_URLS[t as OntologyType]})`).join('\n')}
  A concept can have multiple types (e.g. a person who is also an author: ["person", "creative-work"])

Only return the JSON array, no other text. Identify ${conceptMin}-${conceptMax} of the most important concepts.`,
    { system: 'You are a knowledge base organizer. Extract key concepts from source summaries. Return valid JSON only.', maxTokens: 4096, action: 'concepts' },
  )

  let concepts: Array<{ slug: string; title: string; description: string; related_sources: string[]; ontology?: string[] }>
  try {
    concepts = JSON.parse(conceptsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    if (spinner) spinner.warn('Could not parse concepts. Skipping concept generation.')
    else onProgress?.('⚠ Could not parse concepts. Skipping concept generation.')
    return
  }

  if (spinner) spinner.succeed(`Found ${concepts.length} concepts`)
  else onProgress?.(`Found ${concepts.length} concepts`)

  const existingConcepts = listWikiArticles()
    .filter(a => a.path.startsWith(paths.wikiConcepts))
    .map(a => basename(a.path, '.md'))

  const newConcepts = concepts.filter(c => !existingConcepts.includes(slugify(c.slug)))

  if (newConcepts.length === 0) return

  const validTargets = [
    ...existingConcepts,
    ...newConcepts.map(c => c.slug),
    ...sourceArticles.map(a => basename(a.path, '.md')),
  ].join(', ')

  const limit = pLimit(concurrency ?? defaultConcurrency)

  let done = 0
  const inFlight = new Set<string>()
  const conceptSpinner = onProgress ? null : ora(`Writing concepts [0/${newConcepts.length}]`).start()

  const updateConceptSpinner = () => {
    if (onProgress) {
      const titles = [...inFlight].join(', ')
      onProgress(`Writing concepts [${done}/${newConcepts.length}]${titles ? ` → ${titles}` : ''}`)
    } else if (conceptSpinner) {
      const titles = [...inFlight].map(t => pc.cyan(t)).join(pc.gray(', '))
      conceptSpinner.text = `Writing concepts [${done}/${newConcepts.length}]\n  ${pc.gray('→')} ${titles}`
    }
  }

  await Promise.all(
    newConcepts.map(concept =>
      limit(async () => {
        inFlight.add(concept.title)
        updateConceptSpinner()

        const relatedContent = sourceArticles
          .filter(a => concept.related_sources.some(s => a.path.includes(s)))
          .map(a => `### ${a.title}\n${a.content.slice(0, 3000)}`)
          .join('\n\n')

        const raw = await llm(
          buildConceptPrompt(concept.title, concept.description, relatedContent, validTargets),
          { system: CONCEPT_SYSTEM, maxTokens: 4096, action: 'concepts' },
        )
        const { body, tags } = sanitizeLlmOutput(raw)

        const ontology = Array.isArray(concept.ontology)
          ? concept.ontology.filter((o): o is OntologyType => ONTOLOGY_TYPES.includes(o as OntologyType))
          : ['concept' as OntologyType]

        const meta: ArticleMeta = {
          title: concept.title,
          type: 'concept',
          ontology: ontology.length ? ontology : ['concept'],
          tags,
          relatedSources: concept.related_sources,
        }

        const safeSlug = slugify(concept.slug)
        if (!safeSlug) return
        writeArticle(join(paths.wikiConcepts, `${safeSlug}.md`), meta, body)
        inFlight.delete(concept.title)
        done++
        updateConceptSpinner()
      })
    )
  )

  if (conceptSpinner) {
    conceptSpinner.succeed(`Wrote ${newConcepts.length} concept${newConcepts.length !== 1 ? 's' : ''}`)
  } else {
    onProgress?.(`✓ Wrote ${newConcepts.length} concept${newConcepts.length !== 1 ? 's' : ''}`)
  }
}

export async function rebuildIndex(root: string, onProgress?: (msg: string) => void): Promise<void> {
  const paths = kbPaths(root)
  const spinner = onProgress ? null : ora('Rebuilding index').start()
  onProgress?.('Rebuilding index...')

  const articles = listWikiArticles()
  const sources = articles.filter(a => a.path.startsWith(paths.wikiSources))
  const concepts = articles.filter(a => a.path.startsWith(paths.wikiConcepts))
  const outputMd = articles.filter(a => a.path.startsWith(paths.output) && a.path.endsWith('.md'))
  const mindMaps = outputMd.filter(a => String(a.frontmatter.type) === 'mind-map')
  const queries = outputMd.filter(a => String(a.frontmatter.type) !== 'mind-map')

  const toObsidianTag = (tag: string) => `#${tag.toLowerCase().replace(/\s+/g, '-')}`

  // Build entity summary for index (top entities by category)
  const buildEntitySummary = (a: (typeof articles)[0]): string => {
    if (!a.entities || Object.keys(a.entities).length === 0) return ''
    const parts: string[] = []
    for (const [category, items] of Object.entries(a.entities)) {
      if (items.length > 0) {
        // Take first 3 entities per category, slugify each entity name
        const display = items.slice(0, 3).map(item => slugify(item)).join(', ')
        parts.push(`${category}/${display}`)
      }
    }
    return parts.length > 0 ? ` — ${parts.join(' | ')}` : ''
  }

  const articleLink = (a: (typeof articles)[0]) => {
    const tagStr = a.tags.length > 0 ? `  ${a.tags.map(toObsidianTag).join(' ')}` : ''
    const entitySummary = buildEntitySummary(a)
    return `- [${a.title}](${relative(paths.wiki, a.path)})${tagStr}${entitySummary}`
  }

  const tagMap = new Map<string, typeof articles>()
  for (const article of articles) {
    for (const tag of article.tags) {
      const list = tagMap.get(tag) ?? []
      list.push(article)
      tagMap.set(tag, list)
    }
  }

  const tagSection = tagMap.size > 0
    ? [...tagMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, tagged]) => {
          const links = tagged.map(a => `[${a.title}](${relative(paths.wiki, a.path)})`).join(', ')
          return `- ${toObsidianTag(tag)}: ${links}`
        })
        .join('\n')
    : ''

  let briefSummary = ''
  if (articles.length > 0) {
    const allContent = articles.map(a => `${a.title}: ${a.content.slice(0, 500)}`).join('\n')
    const rawSummary = await llm(
      `Write a 2-3 sentence summary of this knowledge base based on its articles:\n\n${allContent.slice(0, 10000)}`,
      { system: 'Write a brief, informative summary. No markdown formatting, just plain text.', maxTokens: 256, action: 'compile' },
    )
    briefSummary = normalizeLinks(rawSummary, articles)
  }

  const stats = getWikiStats()

  const index = `# Knowledge Base Index

> Auto-maintained by \`theora compile\`. Last updated: ${new Date().toISOString()}

${briefSummary ? `## Overview\n\n${briefSummary}\n` : ''}
## Sources (${sources.length})

${sources.map(articleLink).join('\n') || '_No sources compiled yet._'}

## Concepts (${concepts.length})

${concepts.map(articleLink).join('\n') || '_No concepts extracted yet._'}
${mindMaps.length > 0 ? `\n## Mind maps (${mindMaps.length})\n\n${mindMaps.map(articleLink).join('\n')}\n` : ''}${queries.length > 0 ? `\n## Previous Queries (${queries.length})\n\n${queries.map(articleLink).join('\n')}\n` : ''}${tagSection ? `\n## Tags (${tagMap.size})\n\n${tagSection}\n` : ''}
## Stats

- **Articles**: ${stats.articles}
- **Words**: ~${stats.words.toLocaleString()}
`

  writeFileSync(paths.wikiIndex, index)
  if (spinner) spinner.succeed('Index rebuilt')
  else onProgress?.('✓ Index rebuilt')
}

