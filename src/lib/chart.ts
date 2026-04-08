import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import pc from 'picocolors'
import ora from 'ora'
import { llm } from './llm.js'
import { findPython } from './deps.js'
import { buildChartPrompt, CHART_SYSTEM } from './prompts.js'
import { slugifyShort } from './utils.js'
import type { KbPaths } from './paths.js'

export function extractPythonCode(raw: string): string {
  const fenceMatch = raw.match(/^```(?:python)?\s*\n([\s\S]*?)\n```\s*$/m)
  if (fenceMatch) return fenceMatch[1].trim()
  const bareFence = raw.match(/^```\s*\n([\s\S]*?)\n```\s*$/m)
  if (bareFence) return bareFence[1].trim()
  return raw.trim()
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

  const spinner = ora('Generating chart').start()

  const raw = await llm(
    buildChartPrompt(question, index, context, pngPath),
    { system: CHART_SYSTEM, maxTokens: 4096 },
  )

  const code = extractPythonCode(raw)
  writeFileSync(pyPath, code)

  try {
    execFileSync(python, [pyPath], { stdio: 'pipe' })
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
