import { Command } from 'commander'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { generateChart } from '../lib/chart.js'
import { saveSlides } from '../lib/slides.js'
import { streamAsk, buildAskContext } from '../lib/ask.js'
import { SLIDES_SYSTEM, buildSlidesUserPrompt } from '../lib/prompts.js'
import { llmStream } from '../lib/llm.js'

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

    if (format === 'md') {
      const spinner = ora('Reading wiki index').start()
      spinner.stop()
      console.log()

      const { filedPath } = await streamAsk(question, {
        tag: options.tag,
        file: options.file,
        onChunk: (text) => process.stdout.write(text),
      })

      console.log('\n')
      if (filedPath) {
        console.log(pc.gray(`Filed to: output/${filedPath.split('/output/')[1]}`))
      }
      return
    }

    const spinner = ora('Reading wiki index').start()
    const { index, context } = await buildAskContext(question, options.tag)
    spinner.stop()

    if (format === 'chart') {
      await generateChart(question, index, context, paths, options.file)
      return
    }

    console.log()
    const rawAnswer = await llmStream(
      buildSlidesUserPrompt(question, index, context),
      { system: SLIDES_SYSTEM, maxTokens: 8192 },
      (text) => process.stdout.write(text),
    )
    console.log('\n')
    saveSlides(rawAnswer, question, paths)
  })
