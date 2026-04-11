import { execFileSync } from 'node:child_process'
import pc from 'picocolors'

interface DepCheck {
  name: string
  check: () => boolean
  install: string
  feature: string
}

export const YT_DLP_INSTALL_HINT = 'brew install yt-dlp'

function canExec(bin: string, args: string[]): boolean {
  try {
    execFileSync(bin, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function hasMarpCli(): boolean {
  return canExec('marp', ['--version'])
}

export function hasFfmpeg(): boolean {
  return canExec('ffmpeg', ['-version'])
}

export function hasYtDlp(): boolean {
  return canExec('yt-dlp', ['--version'])
}

export function findPython(): string | null {
  const candidates = ['python3', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python']
  for (const bin of candidates) {
    if (canExec(bin, ['-c', 'import matplotlib'])) return bin
  }
  for (const bin of candidates) {
    if (canExec(bin, ['--version'])) return bin
  }
  return null
}

export function checkDeps(): void {
  const checks: DepCheck[] = [
    {
      name: 'marp-cli',
      check: hasMarpCli,
      install: 'npm install -g @marp-team/marp-cli',
      feature: '--output slides (PDF export)',
    },
    {
      name: 'python3',
      check: () => canExec('python3', ['--version']),
      install: 'brew install python',
      feature: '--output chart',
    },
    {
      name: 'matplotlib',
      check: () => {
        const pythons = ['python3', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python']
        return pythons.some(p => canExec(p, ['-c', 'import matplotlib']))
      },
      install: 'pip3 install matplotlib',
      feature: '--output chart',
    },
    {
      name: 'yt-dlp',
      check: hasYtDlp,
      install: YT_DLP_INSTALL_HINT,
      feature: 'captions-first YouTube ingest',
    },
    {
      name: 'ffmpeg',
      check: hasFfmpeg,
      install:
        'macOS: brew install ffmpeg (https://brew.sh) — Linux: sudo apt install ffmpeg or sudo dnf install ffmpeg',
      feature: 'video compile + optional audio preprocessing for Whisper (includes ffprobe)',
    },
  ]

  const missing = checks.filter(c => !c.check())

  if (missing.length === 0) {
    console.log(`  ${pc.green('✓')} All optional dependencies installed`)
    return
  }

  console.log(`  ${pc.yellow('Optional dependencies')} (install for full features):`)
  for (const dep of missing) {
    console.log(`  ${pc.yellow('○')} ${pc.white(dep.name)} — needed for ${pc.gray(dep.feature)}`)
    console.log(`    ${pc.cyan(dep.install)}`)
  }
}
