import pc from 'picocolors'

export interface FileTypeStats {
  type: string
  count: number
  timeMs: number
}

export interface IngestStats {
  totalFiles: number
  ingested: number
  skippedType: number
  skippedDupe: number
  skippedSize: number
  byType: Map<string, FileTypeStats>
  totalTimeMs: number
  startTime: number
}

export interface CompileStats {
  totalFiles: number
  compiled: number
  failed: number
  byType: Map<string, FileTypeStats>
  totalTimeMs: number
  startTime: number
  conceptsFound: number
  conceptsWritten: number
  conceptsTimeMs: number
}

export function createIngestStats(): IngestStats {
  return {
    totalFiles: 0,
    ingested: 0,
    skippedType: 0,
    skippedDupe: 0,
    skippedSize: 0,
    byType: new Map(),
    totalTimeMs: 0,
    startTime: Date.now(),
  }
}

export function createCompileStats(): CompileStats {
  return {
    totalFiles: 0,
    compiled: 0,
    failed: 0,
    byType: new Map(),
    totalTimeMs: 0,
    startTime: Date.now(),
    conceptsFound: 0,
    conceptsWritten: 0,
    conceptsTimeMs: 0,
  }
}

export function recordFileProcessed(
  stats: IngestStats | CompileStats,
  fileType: string,
  timeMs: number,
  success: boolean,
): void {
  stats.totalFiles++
  if (success) {
    if ('ingested' in stats) {
      stats.ingested++
    } else {
      stats.compiled++
    }
  } else if ('failed' in stats) {
    stats.failed++
  }

  const existing = stats.byType.get(fileType)
  if (existing) {
    existing.count++
    existing.timeMs += timeMs
  } else {
    stats.byType.set(fileType, { type: fileType, count: 1, timeMs })
  }

  stats.totalTimeMs += timeMs
}

export function finalizeStats(stats: IngestStats | CompileStats): void {
  stats.totalTimeMs = Date.now() - stats.startTime
}

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = ((ms % 60000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

function formatAvgTime(timeMs: number, count: number): string {
  if (count === 0) return '-'
  const avg = timeMs / count
  if (avg < 1) return '<1ms'
  if (avg < 1000) return `${Math.round(avg)}ms`
  return formatDuration(avg)
}

export function displayIngestStats(stats: IngestStats, validExts: Set<string>): string {
  const lines: string[] = []

  lines.push('')
  lines.push(pc.bold('Ingest Summary'))
  lines.push(pc.gray(`  ${stats.totalFiles} files in ${formatDuration(stats.totalTimeMs)}`))
  lines.push('')

  // File type breakdown
  if (stats.byType.size > 0) {
    const sortedTypes = [...stats.byType.entries()]
      .filter(([type]) => type !== 'skipped' && type !== 'error')
      .sort((a, b) => b[1].count - a[1].count)

    if (sortedTypes.length > 0) {
      lines.push(pc.gray('  By type:'))
      for (const [type, data] of sortedTypes) {
        const timeStr = formatDuration(data.timeMs)
        const avgStr = formatAvgTime(data.timeMs, data.count)
        lines.push(`    ${type.padEnd(10)} ${String(data.count).toString().padStart(2)} ${data.count === 1 ? 'file ' : 'files'}  ${timeStr.padStart(8)}  avg ${avgStr}`)
      }
      lines.push('')
    }
  }

  // Status breakdown
  const parts: string[] = []
  if (stats.ingested > 0) parts.push(`${stats.ingested} ingested`)
  if (stats.skippedType > 0) parts.push(`${stats.skippedType} skipped (unsupported type)`)
  if (stats.skippedDupe > 0) parts.push(`${stats.skippedDupe} skipped (already ingested)`)
  if (stats.skippedSize > 0) parts.push(`${stats.skippedSize} skipped (exceeds size limit)`)

  lines.push(pc.gray('  Status: ') + parts.join(', '))

  if (stats.skippedType > 0) {
    lines.push(pc.gray(`  Supported: ${[...validExts].join(', ')}`))
  }

  lines.push('')

  return lines.join('\n')
}

export function displayCompileStats(stats: CompileStats): string {
  const lines: string[] = []

  lines.push('')
  lines.push(pc.bold('Compile Summary'))

  // Show appropriate summary based on what was processed
  if (stats.totalFiles > 0) {
    lines.push(pc.gray(`  ${stats.totalFiles} sources in ${formatDuration(stats.totalTimeMs)}`))
  } else if (stats.conceptsFound > 0 || stats.conceptsWritten > 0) {
    lines.push(pc.gray(`  Concepts in ${formatDuration(stats.totalTimeMs)}`))
  } else {
    lines.push(pc.gray(`  Completed in ${formatDuration(stats.totalTimeMs)}`))
  }
  lines.push('')

  // File type breakdown
  if (stats.byType.size > 0) {
    const sortedTypes = [...stats.byType.entries()]
      .filter(([type]) => type !== 'skipped' && type !== 'error')
      .sort((a, b) => b[1].count - a[1].count)

    if (sortedTypes.length > 0) {
      lines.push(pc.gray('  By type:'))
      for (const [type, data] of sortedTypes) {
        const timeStr = formatDuration(data.timeMs)
        const avgStr = formatAvgTime(data.timeMs, data.count)
        lines.push(`    ${type.padEnd(10)} ${String(data.count).toString().padStart(2)} ${data.count === 1 ? 'file ' : 'files'}  ${timeStr.padStart(8)}  avg ${avgStr}`)
      }
      lines.push('')
    }
  }

  // Status breakdown
  const parts: string[] = []
  if (stats.compiled > 0) parts.push(`${stats.compiled} compiled`)
  if (stats.failed > 0) parts.push(`${stats.failed} failed`)

  // If nothing was compiled or failed (e.g., concepts-only mode), show done
  if (parts.length === 0) {
    parts.push('done')
  }

  lines.push(pc.gray('  Status: ') + parts.join(', '))

  // Concepts
  if (stats.conceptsFound > 0 || stats.conceptsWritten > 0) {
    const timeStr = formatDuration(stats.conceptsTimeMs)
    const avgStr = formatAvgTime(stats.conceptsTimeMs, stats.conceptsWritten)
    lines.push(pc.gray(`  Concepts: ${stats.conceptsFound} found, ${stats.conceptsWritten} written  ${timeStr.padStart(8)}  avg ${avgStr}`))
  }

  lines.push('')

  return lines.join('\n')
}
