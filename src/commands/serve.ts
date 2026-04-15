import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { readConfig, getKbName } from '../lib/config.js'
import { startServer } from '../web/server.js'

export const serveCommand = new Command('serve')
  .description(
    'Start a local web server for the knowledge base (wiki, search, ask, compile, and settings). Use --share when you want LAN URLs, a QR code, and Safari (iOS) tips for opening from a phone or tablet on your network.',
  )
  .option('-p, --port <port>', 'port to listen on', '4000')
  .option(
    '--share',
    'show LAN URLs, terminal QR code, and Safari (iOS) plain-HTTP tips for other devices on your network',
  )
  .action((options: { port: string; share?: boolean }) => {
    const root = requireKbRoot()
    const port = parseInt(options.port, 10)

    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error(pc.red(`Invalid port: ${options.port}`))
      process.exitCode = 1
      return
    }

    const config = readConfig()
    const kbName = getKbName(config)
    startServer({ port, kbRoot: root, kbName, share: Boolean(options.share) })
  })
