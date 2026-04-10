import { Command } from 'commander'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import ora from 'ora'
import { kbPaths, findKbRoot } from '../lib/paths.js'
import { checkDeps } from '../lib/deps.js'
import { DEFAULT_THEME } from '../lib/theme.js'
import type { KbConfig } from '../lib/config.js'
import type { Provider } from '../lib/types.js'
import { DEFAULT_MODELS } from '../lib/types.js'
import { getDefaultActionModels, getDefaultLocalModelPricing } from '../lib/config.js'
import { createGlobalEnv, globalEnvExists, getGlobalEnvPath } from '../lib/env.js'

export const initCommand = new Command('init')
  .description('Initialize a new knowledge base')
  .argument('[name]', 'name for the knowledge base', 'knowledge-base')
  .option('--provider <provider>', 'LLM provider: openai, openai-compatible, anthropic', 'openai')
  .option('--model <model>', 'model name (defaults to provider default)')
  .option('--concurrency <n>', 'parallel LLM calls during compile (default: 3)', '3')
  .action(async (name: string, options: { provider: string; model?: string; concurrency: string }) => {
    const cwd = process.cwd()

    if (findKbRoot(cwd)) {
      console.log(pc.yellow('Already inside a knowledge base.'))
      return
    }

    const spinner = ora('Initializing knowledge base').start()

    const paths = kbPaths(cwd)
    const provider = options.provider as Provider
    const model = options.model ?? DEFAULT_MODELS[provider] ?? 'gpt-4o'

    for (const dir of [paths.config, paths.raw, paths.wiki, paths.wikiConcepts, paths.wikiSources, paths.output]) {
      mkdirSync(dir, { recursive: true })
    }

    const config: KbConfig = {
      name,
      created: new Date().toISOString(),
      provider,
      model,
      models: getDefaultActionModels(provider, model),
      localModelPricing: getDefaultLocalModelPricing(),
      compileConcurrency: parseInt(options.concurrency, 10),
      conceptSummaryChars: 3000,
      conceptMin: 5,
      conceptMax: 10,
    }
    writeFileSync(paths.configFile, JSON.stringify(config, null, 2) + '\n')

    if (!existsSync(paths.theme)) {
      writeFileSync(paths.theme, DEFAULT_THEME)
    }

    if (!existsSync(join(cwd, '.env'))) {
      writeFileSync(join(cwd, '.env'), `# theora — LLM API Keys

# OpenAI (default)
OPENAI_API_KEY=

# OpenAI-compatible
# OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
# OPENAI_COMPATIBLE_API_KEY=   # optional for local servers

# Anthropic
# ANTHROPIC_API_KEY=
`)
    }

    // Check/create global .env
    let globalEnvMessage = ''
    if (!globalEnvExists()) {
      const globalEnvPath = createGlobalEnv()
      globalEnvMessage = `\nCreated global .env at ${pc.cyan(globalEnvPath)}`
    } else {
      globalEnvMessage = `\nUsing global .env at ${pc.cyan(getGlobalEnvPath())}`
    }

    writeFileSync(paths.wikiIndex, `# ${name}

> Auto-maintained index. Do not edit manually.

## Sources

_No sources ingested yet. Run \`theora ingest <file>\` to add documents._

## Concepts

_No concepts compiled yet. Run \`theora compile\` after ingesting sources._
`)

    spinner.succeed('Knowledge base initialized')

    console.log()
    console.log(`  ${pc.gray('raw/')}        Source documents`)
    console.log(`  ${pc.gray('wiki/')}       Compiled wiki`)
    console.log(`  ${pc.gray('output/')}     Answers, slides, charts`)
    console.log(`  ${pc.gray('.env')}        API keys (KB-specific)`)
    console.log(`  ${pc.gray('.theora/')}    Config and theme`)
    console.log(globalEnvMessage)
    console.log()
    console.log(`  Provider: ${pc.white(provider)}  Model: ${pc.white(model)}`)
    console.log()

    checkDeps()

    console.log()
    console.log(`Next: add your API key to ${pc.cyan('.env')}, then ${pc.cyan('theora ingest <file>')}`)
    console.log(pc.gray('       (or use the global .env at ~/.theora/.env for all KBs)'))
  })
