import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import pc from 'picocolors'
import ora from 'ora'
import { hasMarpCli } from './deps.js'
import { slugifyShort } from './utils.js'
import type { KbPaths } from './paths.js'

export function exportToPdf(marpPath: string, pdfPath: string, themePath: string): boolean {
  try {
    const args = ['--no-stdin', marpPath, '-o', pdfPath, '--allow-local-files']
    if (existsSync(themePath)) args.push('--theme', themePath)
    execFileSync('marp', args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function saveSlides(
  answer: string,
  question: string,
  paths: KbPaths,
): void {
  const slug = slugifyShort(question)
  mkdirSync(paths.output, { recursive: true })

  const marpPath = join(paths.output, `${slug}.marp.md`)
  writeFileSync(marpPath, answer)

  if (hasMarpCli()) {
    const pdfPath = join(paths.output, `${slug}.pdf`)
    const spinner = ora('Converting to PDF').start()
    const ok = exportToPdf(marpPath, pdfPath, paths.theme)
    if (ok) {
      spinner.succeed('Slide deck exported')
      console.log(pc.gray(`  PDF:  output/${slug}.pdf`))
      console.log(pc.gray(`  Marp: output/${slug}.marp.md`))
    } else {
      spinner.warn('PDF export failed — marp.md saved')
      console.log(pc.gray(`  Filed to: output/${slug}.marp.md`))
    }
  } else {
    console.log(pc.gray(`Filed to: output/${slug}.marp.md`))
    console.log(pc.gray(`Install marp-cli for auto PDF export: npm i -g @marp-team/marp-cli`))
  }
}
