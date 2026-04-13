import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import pc from 'picocolors'

export interface CompilationErrorLog {
  timestamp: string
  sourceFile: string
  sourceType: string
  errorType: 'ffmpeg' | 'ffprobe' | 'file_not_found' | 'invalid_format' | 'markdown_as_video' | 'unknown'
  errorMessage: string
  fullCommand?: string
  suggestions: string[]
  autoFixed?: boolean
  fixAttempted?: string
}

export interface AutoFixResult {
  fixed: boolean
  fixDescription?: string
  newSourcePath?: string
}

function getLogDir(): string {
  const logDir = join(homedir(), '.theora', 'logs')
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

function generateLogFilename(sourceFile: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseName = sourceFile.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
  return `compile-${baseName}-${timestamp}.log`
}

function analyzeError(error: Error, sourceFile: string): CompilationErrorLog {
  const message = error.message
  let errorType: CompilationErrorLog['errorType'] = 'unknown'
  let suggestions: string[] = []
  let fullCommand: string | undefined

  // Extract command from error message if present
  const commandMatch = message.match(/Command failed:\s*(.+?)(?:\n|$)/)
  if (commandMatch) {
    fullCommand = commandMatch[1]
  }

  // Analyze error patterns
  if (message.includes('Invalid data found when processing input')) {
    errorType = 'invalid_format'
    suggestions = [
      'The file may not be a valid video file.',
      'Check that the file extension matches the actual content (e.g., .mp4, .mov, .avi).',
      'If this is a YouTube transcript markdown file, it should be processed as text, not video.',
    ]
  } else if (message.includes('No such file or directory')) {
    errorType = 'file_not_found'
    suggestions = [
      'The source file may have been moved or deleted.',
      'Check that the file exists in the raw/ directory.',
    ]
  } else if (message.includes('ffmpeg')) {
    errorType = 'ffmpeg'
    suggestions = [
      'Ensure ffmpeg is properly installed: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)',
      'Check that the video file is not corrupted.',
      'Try running the command manually to see more details.',
    ]
  } else if (message.includes('ffprobe')) {
    errorType = 'ffprobe'
    suggestions = [
      'ffprobe is typically installed with ffmpeg. Ensure ffmpeg is properly installed.',
      'Check that the video file is not corrupted.',
    ]
  }

  return {
    timestamp: new Date().toISOString(),
    sourceFile,
    sourceType: 'video',
    errorType,
    errorMessage: message,
    fullCommand,
    suggestions,
  }
}

export function logCompilationError(error: Error, sourceFile: string): string {
  const logEntry = analyzeError(error, sourceFile)
  const logDir = getLogDir()
  const logFile = generateLogFilename(sourceFile)
  const logPath = join(logDir, logFile)

  const logContent = JSON.stringify(logEntry, null, 2)
  writeFileSync(logPath, logContent + '\n')

  return logPath
}

export function formatCompilationErrorForDisplay(error: Error, sourceFile: string, logPath: string): string {
  const logEntry = analyzeError(error, sourceFile)

  const lines: string[] = []
  lines.push('')
  lines.push(pc.red(`✗ Compilation failed for ${pc.bold(basename(sourceFile))}`))
  lines.push('')

  // Human-friendly error description
  switch (logEntry.errorType) {
    case 'invalid_format':
      lines.push(pc.yellow('The file does not appear to be a valid video file.'))
      break
    case 'file_not_found':
      lines.push(pc.yellow('The source file could not be found.'))
      break
    case 'ffmpeg':
      lines.push(pc.yellow('FFmpeg encountered an error processing this video.'))
      break
    case 'ffprobe':
      lines.push(pc.yellow('FFprobe could not analyze this video.'))
      break
    default:
      lines.push(pc.yellow('An unexpected error occurred during compilation.'))
  }

  lines.push('')

  // Suggestions
  if (logEntry.suggestions.length > 0) {
    lines.push(pc.cyan('Suggestions:'))
    for (const suggestion of logEntry.suggestions) {
      lines.push(`  • ${suggestion}`)
    }
    lines.push('')
  }

  // Log file location
  lines.push(pc.gray(`Error details saved to: ${logPath}`))
  lines.push(pc.gray('You can review the full error log for more technical details.'))
  lines.push('')

  return lines.join('\n')
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}
