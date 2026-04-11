import { Command } from 'commander'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import pc from 'picocolors'
import { readConfigAtRoot } from '../lib/config.js'
import { readGlobalConfig, writeGlobalConfig } from '../lib/global-config.js'
import { isKbRoot } from '../lib/paths.js'

function validateKbPath(inputPath: string): string {
  const resolvedPath = resolve(inputPath)

  if (!existsSync(resolvedPath)) {
    throw new Error(`Path not found: ${resolvedPath}`)
  }

  if (!statSync(resolvedPath).isDirectory()) {
    throw new Error(`Not a directory: ${resolvedPath}`)
  }

  if (!isKbRoot(resolvedPath)) {
    throw new Error(`Not a Theora knowledge base: ${resolvedPath}`)
  }

  return resolvedPath
}

function getKbDisplayName(root: string): string {
  return readConfigAtRoot(root).name
}

export const kbCommand = new Command('kb')
  .description('Manage saved knowledge bases')

kbCommand
  .command('use')
  .description('Set the active knowledge base')
  .argument('<path>', 'path to a Theora knowledge base')
  .action((inputPath: string) => {
    const root = validateKbPath(inputPath)
    const name = getKbDisplayName(root)
    const config = readGlobalConfig()

    const otherKbs = (config.knownKbs ?? []).filter((entry) => entry.path !== root)
    const knownKbs = [...otherKbs, { name, path: root }]
      .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))

    writeGlobalConfig({
      activeKb: root,
      knownKbs,
    })

    console.log(pc.green('✓') + ` Active KB set to ${pc.white(name)}`)
    console.log(`  Path: ${pc.gray(root)}`)
  })

kbCommand
  .command('list')
  .description('List saved knowledge bases')
  .action(() => {
    const config = readGlobalConfig()
    const knownKbs = config.knownKbs ?? []

    if (knownKbs.length === 0) {
      console.log(pc.yellow('No saved knowledge bases.'))
      console.log(pc.gray('Run `theora kb use <path>` to save and activate one.'))
      return
    }

    console.log(pc.bold('\nSaved Knowledge Bases\n'))

    for (const entry of knownKbs) {
      const isActive = entry.path === config.activeKb
      const marker = isActive ? pc.green('●') : pc.gray('○')
      const label = isActive ? `${pc.green('active')} ` : ''
      const status = existsSync(entry.path) ? '' : ` ${pc.red('(missing)')}`

      console.log(`  ${marker} ${label}${pc.white(entry.name)}${status}`)
      console.log(`    ${pc.gray(entry.path)}`)
    }

    console.log()
  })
