import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pc from 'picocolors'
import { initCommand } from './commands/init.js'
import { ingestCommand } from './commands/ingest.js'
import { compileCommand } from './commands/compile.js'
import { askCommand } from './commands/ask.js'
import { searchCommand } from './commands/search.js'
import { lintCommand } from './commands/lint.js'
import { statsCommand } from './commands/stats.js'
import { tailCommand } from './commands/tail.js'
import { serveCommand } from './commands/serve.js'
import { settingsCommand } from './commands/settings.js'
import { kbCommand } from './commands/kb.js'
import { mapCommand } from './commands/map.js'
import { exportCommand } from './commands/export.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getVersion(): string {
  const pkgPath = join(__dirname, '..', 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  return pkg.version
}

const BANNER = `
${pc.white('████████╗██╗  ██╗███████╗ ██████╗ ██████╗  █████╗ ')}
${pc.white('╚══██╔══╝██║  ██║██╔════╝██╔═══██╗██╔══██╗██╔══██╗')}
${pc.white('   ██║   ███████║█████╗  ██║   ██║██████╔╝███████║')}
${pc.white('   ██║   ██╔══██║██╔══╝  ██║   ██║██╔══██╗██╔══██║')}
${pc.white('   ██║   ██║  ██║███████╗╚██████╔╝██║  ██║██║  ██║')}
${pc.gray('   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝')}
`

const program = new Command()

program
  .name('theora')
  .description('LLM-powered knowledge base that turns raw research into a living wiki')
  .version(getVersion(), '-v, --version')
  .addHelpText('before', BANNER)

program.addCommand(initCommand)
program.addCommand(ingestCommand)
program.addCommand(compileCommand)
program.addCommand(askCommand)
program.addCommand(searchCommand)
program.addCommand(lintCommand)
program.addCommand(statsCommand)
program.addCommand(tailCommand)
program.addCommand(serveCommand)
program.addCommand(settingsCommand)
program.addCommand(kbCommand)
program.addCommand(mapCommand)
program.addCommand(exportCommand)

function handleError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n${pc.red('Error:')} ${msg}\n`)
  process.exit(1)
}

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

program.parseAsync().catch(handleError)
