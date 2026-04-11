import { Command } from 'commander'
import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { watchFile, unwatchFile } from 'node:fs'
import pc from 'picocolors'
import { readLlmLogs, type LlmCallLog } from '../lib/llm-stats.js'
import { formatDuration } from '../lib/utils.js'

function formatLogNotes(log: LlmCallLog): string {
  const parts: string[] = []
  if (log.transcribeInputBytes != null && log.transcribeInputBytes > 0) {
    parts.push(`${Math.round(log.transcribeInputBytes / 1024)}KiB`)
  }
  if (log.transcribeDurationSec != null && log.transcribeDurationSec > 0) {
    parts.push(`${log.transcribeDurationSec.toFixed(1)}s`)
  }
  if (log.transcribeOutputChars != null) {
    parts.push(`${log.transcribeOutputChars}ch`)
  }
  if (
    log.contextCompressionPreChars != null &&
    log.contextCompressionPostChars != null &&
    log.contextCompressionProvider
  ) {
    parts.push(
      `${log.contextCompressionProvider} ${log.contextCompressionPreChars}\u2192${log.contextCompressionPostChars}`,
    )
  }
  return parts.length ? pc.dim(`  ${parts.join(' \u00b7 ')}`) : ''
}

function formatLogEntry(log: LlmCallLog): string {
  const timestamp = new Date(log.timestamp).toLocaleTimeString()
  const action = pc.cyan(log.action.padEnd(10))
  const meta = log.meta ? pc.gray(log.meta.padEnd(6)) : ' '.repeat(6)
  const provider = pc.gray(log.provider.padEnd(18))
  const model = pc.gray(log.model.slice(0, 28).padEnd(28))
  const tokens = `${log.inputTokens}+${log.outputTokens}`.padStart(10)
  const cost = pc.yellow(`$${log.estimatedCostUsd.toFixed(4)}`.padStart(8))
  const duration = formatDuration(log.durationMs).padStart(10)
  const notes = formatLogNotes(log)

  return `${pc.gray(timestamp)}  ${action}  ${meta}  ${provider}  ${model}  ${tokens} tok  ${cost}  ${duration}${notes}`
}

function formatLogEntryCompact(log: LlmCallLog): string {
  const timestamp = new Date(log.timestamp).toLocaleTimeString()
  const meta = log.meta ? ` [${log.meta}]` : ''
  const notes = formatLogNotes(log).replace(/\x1b\[[0-9;]*m/g, '')
  return `${timestamp}  ${log.action}${meta}  ${log.provider} / ${log.model}  ${log.inputTokens}+${log.outputTokens} tok  $${log.estimatedCostUsd.toFixed(4)}  ${formatDuration(log.durationMs)}${notes}`
}

export const tailCommand = new Command('tail')
  .description('Tail LLM call logs in readable format')
  .option('-n, --lines <n>', 'number of lines to show', '20')
  .option('-f, --follow', 'follow log output', false)
  .option('--json', 'output as JSON')
  .option('--compact', 'compact output (no colors)')
  .action(async (options: { lines: string; follow?: boolean; json?: boolean; compact?: boolean }) => {
    const logs = readLlmLogs()

    if (logs.length === 0) {
      console.log(pc.gray('No LLM calls recorded yet.'))
      return
    }

    const lines = parseInt(options.lines, 10)

    // Get last N logs
    const recentLogs = logs.slice(-lines)

    if (options.json) {
      console.log(JSON.stringify(recentLogs, null, 2))
      return
    }

    // Print header
    if (!options.compact) {
      console.log(`\n${pc.bold('LLM Call Logs')}`)
      console.log(pc.gray(`  Showing last ${recentLogs.length} of ${logs.length} calls\n`))
      console.log(`${pc.gray('Time'.padEnd(10))}  ${'Action'.padEnd(10)}  ${'Meta'.padEnd(6)}  ${'Provider'.padEnd(18)}  ${'Model'.padEnd(28)}  ${'Tokens'.padStart(10)}  ${'Cost'.padStart(8)}  ${'Duration'.padStart(8)}`)
      console.log(pc.gray('─'.repeat(125)))
    }

    // Print logs
    for (const log of recentLogs) {
      if (options.compact) {
        console.log(formatLogEntryCompact(log))
      } else {
        console.log(formatLogEntry(log))
      }
    }

    console.log()

    // Follow mode
    if (options.follow) {
      if (!options.compact) {
        console.log(pc.gray('Following logs... (press Ctrl+C to exit)\n'))
      }

      let lastCount = logs.length

      // Poll for new logs every second
      const interval = setInterval(() => {
        const newLogs = readLlmLogs()
        if (newLogs.length > lastCount) {
          const newEntries = newLogs.slice(lastCount)
          for (const log of newEntries) {
            if (options.compact) {
              console.log(formatLogEntryCompact(log))
            } else {
              console.log(formatLogEntry(log))
            }
          }
          lastCount = newLogs.length
        }
      }, 1000)

      // Keep process alive
      await new Promise(() => {})
      clearInterval(interval)
    }
  })
