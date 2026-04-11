import { Command } from 'commander'
import { getSettingsInfo } from '../lib/settings.js'
import pc from 'picocolors'

export const settingsCommand = new Command('settings')
  .description('Show Theora configuration and environment info')
  .action(() => {
    const info = getSettingsInfo()
    const kbSourceLabel = {
      cwd: 'Current Directory',
      global: 'Global Active KB',
      none: 'None',
    }[info.kbResolutionSource]

    console.log(pc.bold('\nTheora Settings\n'))

    // Knowledge Base Info
    if (info.kbRoot) {
      console.log(pc.cyan('Knowledge Base:'))
      console.log(`  Root: ${info.kbRoot}`)
      console.log(`  Resolved From: ${kbSourceLabel}`)
      if (info.kbConfig) {
        console.log(`  Name: ${info.kbConfig.name}`)
        console.log(`  Provider: ${info.kbConfig.provider}`)
        console.log(`  Default Model: ${info.kbConfig.model}`)
        if (info.kbConfig.provider === 'openai-compatible' && info.kbConfig.localModelPricing) {
          console.log(`  Local Pricing: ${info.kbConfig.localModelPricing.mode}`)
        }
      }
    } else {
      console.log(pc.yellow('Not in a knowledge base directory'))
    }

    console.log(pc.cyan('\nGlobal KB Config:'))
    console.log(`  Path: ${info.globalConfigPath}`)
    console.log(`  Exists: ${info.globalConfigExists ? pc.green('yes') : pc.red('no')}`)
    console.log(`  Active KB: ${info.activeKb ? pc.green(info.activeKb) : pc.red('none')}`)
    console.log(`  Saved KBs: ${info.knownKbsCount}`)

    // Environment File Info
    console.log(pc.cyan('\nEnvironment File:'))
    console.log(`  Global: ${info.globalEnvPath}`)
    console.log(`  Global exists: ${info.globalEnvExists ? pc.green('yes') : pc.red('no')}`)

    if (info.envLocation.exists) {
      const sourceLabel = {
        'kb': 'Knowledge Base',
        'cwd': 'Current Directory',
        'global': 'Global',
        'none': 'None'
      }[info.envLocation.source]
      console.log(`  Active: ${pc.green(sourceLabel)} (${info.envLocation.path})`)
    } else {
      console.log(`  Active: ${pc.red('None found')}`)
      console.log(pc.yellow('  Run "theora init" to create a global .env file'))
    }

    // Environment Variables (keys only)
    if (info.envKeys.length > 0) {
      console.log(pc.cyan('\nEnvironment Variables (keys only):'))
      for (const key of info.envKeys) {
        console.log(`  - ${key}`)
      }
    } else {
      console.log(pc.yellow('\nNo environment variables found in .env files'))
    }

    console.log() // trailing newline
  })
