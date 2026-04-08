import { Command } from 'commander'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { llmStream } from '../lib/llm.js'
import { listWikiArticles, readWikiIndex, normalizeLinks } from '../lib/wiki.js'
import { findRelevantArticles, buildContext } from '../lib/query.js'
import { generateChart } from '../lib/chart.js'
import { saveSlides } from '../lib/slides.js'
import { slugifyShort } from '../lib/utils.js'
import { SLIDES_SYSTEM, MD_SYSTEM, buildSlidesUserPrompt, buildMdUserPrompt } from '../lib/prompts.js'

type OutputFormat = 'md' | 'slides' | 'chart'

export const askCommand = new Command('ask')
  .description('Ask a question against the wiki')
  .argument('<question...>', 'your question')
  .option('--no-file', 'do not file the answer back into the wiki')
  .option('--output <format>', 'output format: md, slides, chart', 'md')
  .option('--tag <tag>', 'filter wiki articles by tag')
  .action(async (questionParts: string[], options: { file: boolean; output: string; tag?: string }) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const question = questionParts.join(' ')
    const format = options.output as OutputFormat

    const spinner = ora('Reading wiki index').start()
    const index = readWikiIndex()
    let articles = listWikiArticles()

    if (options.tag) {
      articles = articles.filter(a =>
        a.tags.some(t => t.toLowerCase() === options.tag!.toLowerCase()),
      )
    }

    const relevant = await findRelevantArticles(question, index, articles)
    spinner.stop()

    const context = buildContext(relevant)

    if (format === 'chart') {
      await generateChart(question, index, context, paths, options.file)
      return
    }

    console.log()

    const isSlides = format === 'slides'
    const rawAnswer = await llmStream(
      isSlides ? buildSlidesUserPrompt(question, index, context) : buildMdUserPrompt(question, index, context),
      { system: isSlides ? SLIDES_SYSTEM : MD_SYSTEM, maxTokens: 8192 },
      (text) => process.stdout.write(text),
    )
    const answer = isSlides ? rawAnswer : normalizeLinks(rawAnswer, articles)

    console.log('\n')

    if (!options.file) return

    const slug = slugifyShort(question)
    mkdirSync(paths.output, { recursive: true })

    if (isSlides) {
      saveSlides(answer, question, paths)
    } else {
      const timestamp = new Date().toISOString()
      const filed = `---
title: "${question}"
type: query
date: ${timestamp}
---

# ${question}

${answer}

---
*Query filed on ${timestamp}*
`
      const outputPath = join(paths.output, `${slug}.md`)
      writeFileSync(outputPath, filed)
      console.log(pc.gray(`Filed to: output/${slug}.md`))
    }
  })
