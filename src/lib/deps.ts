import { execFileSync, execSync } from 'node:child_process'
import pc from 'picocolors'

interface DepCheck {
  name: string
  check: () => boolean
  install: string
  feature: string
}

export function hasMarpCli(): boolean {
  try {
    execSync('marp --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function findPython(): string | null {
  const candidates = ['python3', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python']
  for (const bin of candidates) {
    try {
      execSync(`${bin} -c "import matplotlib"`, { stdio: 'ignore' })
      return bin
    } catch {
      continue
    }
  }
  for (const bin of candidates) {
    try {
      execSync(`${bin} --version`, { stdio: 'ignore' })
      return bin
    } catch {
      continue
    }
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
      check: () => { try { execSync('python3 --version', { stdio: 'ignore' }); return true } catch { return false } },
      install: 'brew install python',
      feature: '--output chart',
    },
    {
      name: 'matplotlib',
      check: () => {
        const pythons = ['python3', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python']
        return pythons.some(p => { try { execSync(`${p} -c "import matplotlib"`, { stdio: 'ignore' }); return true } catch { return false } })
      },
      install: 'pip3 install matplotlib',
      feature: '--output chart',
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
