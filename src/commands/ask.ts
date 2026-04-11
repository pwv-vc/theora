import { stdin as stdinStream } from 'node:process'
import { Command } from 'commander'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, requireKbRoot } from '../lib/paths.js'
import { generateChart } from '../lib/chart.js'
import { saveSlides } from '../lib/slides.js'
import { streamAsk, buildAskContext } from '../lib/ask.js'
import { SLIDES_SYSTEM, buildSlidesUserPrompt } from '../lib/prompts/index.js'
import { llmStream } from '../lib/llm.js'

type OutputFormat = 'md' | 'slides' | 'chart'

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8').trimEnd()
}

export const askCommand = new Command('ask')
  .description('Ask a question against the wiki')
  .argument(
    '[question...]',
    'your question (omit when using --stdin; otherwise quote in zsh/bash if needed for globs: ?, *, [)',
  )
  .option('--no-file', 'do not file the answer back into the wiki')
  .option('--output <format>', 'output format: md, slides, chart', 'md')
  .option('--tag <tag>', 'filter wiki articles by tag')
  .option(
    '--stdin',
    'read the question from stdin (avoids shell glob expansion on ?, *, [)',
  )
  .action(
    async (
      questionParts: string[],
      options: { file: boolean; output: string; tag?: string; stdin?: boolean },
    ) => {
    const root = requireKbRoot()
    const paths = kbPaths(root)
    const argvQuestion = questionParts ?? []

    let question: string
    if (options.stdin) {
      if (argvQuestion.length > 0) {
        console.error(
          pc.red('Cannot combine --stdin with a positional question. Use one or the other.'),
        )
        process.exitCode = 1
        return
      }
      question = await readStdinUtf8()
      if (!question.trim()) {
        console.error(pc.red('No question read from stdin.'))
        process.exitCode = 1
        return
      }
    } else {
      question = argvQuestion.join(' ')
      if (!question.trim()) {
        console.error(
          pc.red('Missing question. Pass arguments or use --stdin (see theora ask --help).'),
        )
        process.exitCode = 1
        return
      }
    }
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
      { system: SLIDES_SYSTEM, maxTokens: 8192, action: 'slides' },
      (text) => process.stdout.write(text),
    )
    console.log('\n')
    saveSlides(rawAnswer, question, paths)
  })
