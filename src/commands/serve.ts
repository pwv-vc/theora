import { Command } from 'commander'
import { requireKbRoot } from '../lib/paths.js'
import { readConfig, getKbName, DEFAULT_SERVE_PORT, SERVE_PORT_ENV, resolveServePort } from '../lib/config.js'
import { startServer } from '../web/server.js'

export const serveCommand = new Command('serve')
  .description(
    'Start a local web server for the knowledge base (wiki, search, ask, compile, and settings). Use --share when you want LAN URLs, a QR code, and Safari (iOS) tips for opening from a phone or tablet on your network.',
  )
  .option('-p, --port <port>', `port to listen on (fallback: ${SERVE_PORT_ENV} env, config servePort, default ${DEFAULT_SERVE_PORT})`)
  .option(
    '--share',
    'show LAN URLs, terminal QR code, and Safari (iOS) plain-HTTP tips for other devices on your network',
  )
  .option('--debug', 'enable MCP debug logging (THEORA_MCP_DEBUG)')
  .action((options: { port?: string; share?: boolean; debug?: boolean }) => {
    if (options.debug) {
      process.env.THEORA_MCP_DEBUG = '1'
    }
    const root = requireKbRoot()
    const config = readConfig()
    const port = resolveServePort(options.port, config)
    const kbName = getKbName(config)
    startServer({ port, kbRoot: root, kbName, share: Boolean(options.share) })
  })
