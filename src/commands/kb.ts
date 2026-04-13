import { Command } from 'commander'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import pc from 'picocolors'
import { readConfigAtRoot } from '../lib/config.js'
import {
  hasConflictingKbName,
  findKnownKbByName,
  findKnownKbByPath,
  readGlobalConfig,
  removeKnownKb,
  writeGlobalConfig,
} from '../lib/global-config.js'
import { isKbRoot } from '../lib/paths.js'
import { kbCreateCommand } from './kb-create.js'

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

function resolveKbReference(reference: string): { root: string; name: string; source: 'path' | 'saved' } {
  const config = readGlobalConfig()
  const savedByPath = findKnownKbByPath(config, reference)
  if (savedByPath) {
    return { root: savedByPath.path, name: savedByPath.name, source: 'saved' }
  }

  const resolvedPath = resolve(reference)
  if (existsSync(resolvedPath) && isKbRoot(resolvedPath)) {
    const root = validateKbPath(reference)
    return { root, name: getKbDisplayName(root), source: 'path' }
  }

  const savedByName = findKnownKbByName(config, reference)
  if (savedByName) {
    return { root: savedByName.path, name: savedByName.name, source: 'saved' }
  }

  if (existsSync(resolvedPath)) {
    validateKbPath(reference)
  }

  throw new Error(`Saved KB or path not found: "${reference}"`)
}

export const kbCommand = new Command('kb')
  .description('Manage saved knowledge bases')

kbCommand.addCommand(kbCreateCommand)

kbCommand
  .command('use')
  .description('Set the active knowledge base')
  .argument('<reference>', 'saved KB name or path to a Theora knowledge base')
  .action((reference: string) => {
    const { root, name, source } = resolveKbReference(reference)

    if (source === 'saved' && !isKbRoot(root)) {
      throw new Error(`Saved KB is no longer valid: ${root}. Remove it with \`theora kb remove ${name}\` or re-save it with \`theora kb use <path>\`.`)
    }

    const config = readGlobalConfig()
    const conflictingKb = hasConflictingKbName(config, { name, path: root })
    if (conflictingKb) {
      throw new Error(
        `Saved KB name already exists: "${name}" is already used for ${conflictingKb.path}. Remove or rename that KB before saving another with the same name.`,
      )
    }

    const otherKbs = (config.knownKbs ?? []).filter((entry) => entry.path !== root)
    const knownKbs = [...otherKbs, { name, path: root }]
      .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))

    writeGlobalConfig({
      activeKb: root,
      knownKbs,
    })

    const sourceNote = source === 'saved' ? ` ${pc.gray('(saved name)')}` : ''
    console.log(pc.green('✓') + ` Active KB set to ${pc.white(name)}${sourceNote}`)
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

kbCommand
  .command('remove')
  .description('Remove a saved knowledge base by name or path')
  .argument('<reference>', 'saved KB name or path')
  .action((reference: string) => {
    const config = readGlobalConfig()
    const byPath = findKnownKbByPath(config, reference)
    const target = byPath ?? findKnownKbByName(config, reference)

    if (!target) {
      throw new Error(`Saved KB not found: "${reference}"`)
    }

    const nextConfig = removeKnownKb(config, reference)
    writeGlobalConfig(nextConfig)

    console.log(pc.green('✓') + ` Removed saved KB ${pc.white(target.name)}`)
    console.log(`  Path: ${pc.gray(target.path)}`)

    if (config.activeKb === target.path) {
      console.log(pc.gray('  Active KB cleared'))
    }
  })
