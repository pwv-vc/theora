import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { startServer } from '../web/server.js'

export const serveCommand = new Command('serve')
  .description('Start a local web server for the knowledge base')
  .option('-p, --port <port>', 'port to listen on', '4000')
  .option('--lan', 'also print LAN URLs (for phones and other devices on your network)')
  .action((options: { port: string; lan?: boolean }) => {
    const root = requireKbRoot()
    const port = parseInt(options.port, 10)

    console.log(pc.cyan('\nStarting Theora web server...'))
    startServer({ port, kbRoot: root, showLanUrls: Boolean(options.lan) })
  })
