import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import pc from 'picocolors'
import ora from 'ora'
import { llm } from './llm.js'
import { findPython } from './deps.js'
import { buildChartPrompt, CHART_SYSTEM } from './prompts/index.js'
import { slugifyShort } from './utils.js'
import type { KbPaths } from './paths.js'

export function extractPythonCode(raw: string): string {
  const fenceMatch = raw.match(/^```(?:python)?\s*\n([\s\S]*?)\n```\s*$/m)
  if (fenceMatch) return fenceMatch[1].trim()
  const bareFence = raw.match(/^```\s*\n([\s\S]*?)\n```\s*$/m)
  if (bareFence) return bareFence[1].trim()
  return raw.trim()
}

const ALLOWED_PYTHON_IMPORTS = new Set([
  'matplotlib', 'matplotlib.pyplot', 'matplotlib.dates', 'matplotlib.ticker',
  'matplotlib.patches', 'matplotlib.colors', 'matplotlib.cm',
  'numpy', 'math', 'datetime', 'collections', 'itertools', 'statistics',
  'calendar', 'decimal', 'fractions', 'random',
])

const DISALLOWED_PATTERNS = /\b(?:subprocess|os\.system|os\.popen|os\.exec|__import__|exec\s*\(|eval\s*\(|compile\s*\(|importlib|ctypes|socket|urllib|requests|httpx|aiohttp|ftplib|smtplib|telnetlib|xmlrpc|pickle|shelve|shutil\.rmtree|pathlib\.Path\.unlink)\b/

export function validateChartCode(code: string): void {
  const importLines = code.match(/^(?:import|from)\s+\S+/gm) ?? []
  for (const line of importLines) {
    const match = line.match(/^(?:import|from)\s+(\S+)/)
    if (!match) continue
    const topLevel = match[1].split('.')[0]
    const full = match[1]
    if (!ALLOWED_PYTHON_IMPORTS.has(topLevel) && !ALLOWED_PYTHON_IMPORTS.has(full)) {
      throw new Error(`Chart code imports disallowed package: "${topLevel}". Only matplotlib, numpy, and standard library math/datetime modules are permitted.`)
    }
  }
  if (DISALLOWED_PATTERNS.test(code)) {
    throw new Error('Chart code contains a disallowed function or module call.')
  }
}

export async function generateChart(
  question: string,
  index: string,
  context: string,
  paths: KbPaths,
  file: boolean,
): Promise<void> {
  const python = findPython()
  if (!python) {
    console.error(pc.red('Python not found. Install Python 3 to generate charts.'))
    console.error(pc.gray('  brew install python  or  https://python.org'))
    process.exit(1)
  }

  const slug = slugifyShort(question)
  const pngPath = join(paths.output, `${slug}.png`)
  const pyPath = join(paths.output, `${slug}.py`)
  mkdirSync(paths.output, { recursive: true })

  console.log(pc.yellow('⚠  Chart generation executes LLM-generated Python code on your machine.'))
  console.log(pc.gray('   Only use this with trusted knowledge bases.'))

  const spinner = ora('Generating chart').start()

  const pngFilename = `${slug}.png`
  const raw = await llm(
    buildChartPrompt(question, index, context, pngFilename),
    { system: CHART_SYSTEM, maxTokens: 4096, action: 'chart' },
  )

  const rawCode = extractPythonCode(raw)
  const code = rawCode.replace(pngFilename, pngPath)

  try {
    validateChartCode(code)
  } catch (err) {
    spinner.fail('Chart code validation failed')
    const msg = err instanceof Error ? err.message : String(err)
    console.error(pc.red(msg))
    writeFileSync(pyPath, code)
    console.log(pc.gray(`Inspect the generated code: output/${slug}.py`))
    return
  }

  writeFileSync(pyPath, code)

  try {
    execFileSync(python, [pyPath], { stdio: 'pipe', timeout: 30_000 })
    spinner.succeed('Chart rendered')
    console.log(pc.gray(`  PNG: output/${slug}.png`))
    console.log(pc.gray(`  Src: output/${slug}.py`))

    if (file) {
      const note = `---
title: "${question}"
type: chart
date: ${new Date().toISOString()}
chart: ${slug}.png
---

# ${question}

![${question}](${slug}.png)

*Generated on ${new Date().toLocaleDateString()}*
`
      writeFileSync(join(paths.output, `${slug}.md`), note)
      console.log(pc.gray(`  Note: output/${slug}.md`))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    spinner.fail('Chart rendering failed')
    console.error(pc.red(msg))
    console.log(pc.gray(`Edit and re-run: ${python} output/${slug}.py`))
  }
}
