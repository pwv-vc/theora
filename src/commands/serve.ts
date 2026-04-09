import { Command } from 'commander'
import pc from 'picocolors'
import { requireKbRoot } from '../lib/paths.js'
import { startServer } from '../web/server.js'

export const serveCommand = new Command('serve')
  .description('Start a local web server for the knowledge base')
  .option('-p, --port <port>', 'port to listen on', '4000')
  .action((options: { port: string }) => {
    const root = requireKbRoot()
    const port = parseInt(options.port, 10)

    console.log(pc.cyan('\nStarting Theora web server...'))
    console.log(pc.gray(`KB root: ${root}`))
    console.log(pc.gray(`Open: ${pc.white(`http://localhost:${port}`)}\n`))

    startServer(port)
  })
