import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  ContextCompressionProvider,
  KbConfig,
} from './config.js'
import { findPythonBinary } from './deps.js'
import { loadEnv } from './env.js'

const TOKEN_COMPANY_COMPRESS_URL = 'https://api.thetokencompany.com/v1/compress'

const CAVEMAN_SCRIPT: Record<
  Exclude<ContextCompressionProvider, 'none' | 'token-company'>,
  string
> = {
  'caveman-nlp': 'caveman_compress_nlp.py',
  'caveman-mlm': 'caveman_compress_mlm.py',
  'caveman-llm': 'caveman_compress.py',
}

const CAVEMAN_TIMEOUT_MS: Record<
  Exclude<ContextCompressionProvider, 'none' | 'token-company'>,
  number
> = {
  'caveman-nlp': 60_000,
  'caveman-mlm': 120_000,
  'caveman-llm': 120_000,
}

export interface ContextCompressionStats {
  provider: string
  preChars: number
  postChars: number
}

export interface CompressContextResult {
  text: string
  compression: ContextCompressionStats | null
}

export interface EffectiveContextCompression {
  provider: ContextCompressionProvider
  minChars: number
  applyToTranscripts: boolean
  cavemanLanguage?: string
  cavemanMlmK?: number
  tokenCompanyModel: string
  tokenCompanyAggressiveness: number
}

function parseProviderStrict(raw: string): ContextCompressionProvider {
  const n = raw.trim().toLowerCase().replace(/_/g, '-')
  if (n === 'none' || n === 'off' || n === 'false' || n === 'no') return 'none'
  if (n === 'token-company' || n === 'ttc' || n === 'thetokencompany' || n === 'tokencompany') {
    return 'token-company'
  }
  if (n === 'caveman-nlp') return 'caveman-nlp'
  if (n === 'caveman-mlm') return 'caveman-mlm'
  if (n === 'caveman-llm') return 'caveman-llm'
  throw new Error(
    `Unknown context compression provider "${raw}". Use none, token-company, caveman-nlp, caveman-mlm, or caveman-llm.`,
  )
}

function parseMinChars(raw: string): number {
  const n = parseInt(raw.trim(), 10)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`CONTEXT_COMPRESSION_MIN_CHARS must be a non-negative integer, got "${raw}"`)
  }
  return n
}

export function getEffectiveContextCompression(config: KbConfig): EffectiveContextCompression {
  loadEnv()
  const cc = config.contextCompression

  let provider: ContextCompressionProvider = 'none'
  const envProvider = process.env.CONTEXT_COMPRESSION_PROVIDER?.trim()
  if (envProvider) {
    provider = parseProviderStrict(envProvider)
  } else if (cc?.provider) {
    provider = parseProviderStrict(String(cc.provider))
  }

  const minCharsEnv = process.env.CONTEXT_COMPRESSION_MIN_CHARS?.trim()
  const minChars =
    minCharsEnv !== undefined && minCharsEnv !== ''
      ? parseMinChars(minCharsEnv)
      : (cc?.minChars ?? 4096)

  let applyToTranscripts = cc?.applyToTranscripts ?? false
  const envApply = process.env.CONTEXT_COMPRESSION_APPLY_TO_TRANSCRIPTS?.trim().toLowerCase()
  if (envApply === '1' || envApply === 'true' || envApply === 'yes') applyToTranscripts = true
  if (envApply === '0' || envApply === 'false' || envApply === 'no') applyToTranscripts = false

  const tokenCompanyModel =
    process.env.TTC_MODEL?.trim() || cc?.tokenCompany?.model || 'bear-1.2'
  const aggEnv = process.env.TTC_AGGRESSIVENESS?.trim()
  let tokenCompanyAggressiveness =
    aggEnv !== undefined && aggEnv !== ''
      ? Number.parseFloat(aggEnv)
      : (cc?.tokenCompany?.aggressiveness ?? 0.1)
  if (!Number.isFinite(tokenCompanyAggressiveness)) {
    tokenCompanyAggressiveness = 0.1
  }

  return {
    provider,
    minChars,
    applyToTranscripts,
    cavemanLanguage: cc?.caveman?.language,
    cavemanMlmK: cc?.caveman?.mlmK,
    tokenCompanyModel,
    tokenCompanyAggressiveness,
  }
}

function resolveCavemanRoot(config: KbConfig): string {
  const fromEnv = process.env.CAVEMAN_COMPRESSION_ROOT?.trim()
  const fromConfig = config.contextCompression?.caveman?.root?.trim()
  const raw = fromEnv ?? fromConfig ?? ''
  if (!raw) {
    throw new Error(
      'Caveman context compression requires CAVEMAN_COMPRESSION_ROOT or contextCompression.caveman.root (path to caveman-compression repo).',
    )
  }
  const root = resolve(raw)
  if (!existsSync(root)) {
    throw new Error(`Caveman root directory not found: ${root}`)
  }
  return root
}

async function compressTokenCompany(input: string, eff: EffectiveContextCompression): Promise<string> {
  const apiKey = process.env.TTC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Token Company context compression requires TTC_API_KEY in .env.')
  }

  const response = await fetch(TOKEN_COMPANY_COMPRESS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      model: eff.tokenCompanyModel,
      compression_settings: { aggressiveness: eff.tokenCompanyAggressiveness },
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(
      `Token Company compress failed: HTTP ${response.status}${errBody ? ` — ${errBody.slice(0, 200)}` : ''}`,
    )
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error('Token Company compress returned invalid JSON.')
  }

  if (!data || typeof data !== 'object' || !('output' in data)) {
    throw new Error('Token Company compress response missing output field.')
  }

  const output = (data as { output: unknown }).output
  if (typeof output !== 'string' || output.length === 0) {
    throw new Error('Token Company compress returned empty or non-string output.')
  }

  return output
}

function compressCaveman(
  input: string,
  eff: EffectiveContextCompression,
  kbConfig: KbConfig,
  variant: Exclude<ContextCompressionProvider, 'none' | 'token-company'>,
): string {
  const python = findPythonBinary()
  if (!python) {
    throw new Error('Caveman context compression requires Python 3 (python3) on PATH.')
  }

  const cavemanRoot = resolveCavemanRoot(kbConfig)
  const scriptName = CAVEMAN_SCRIPT[variant]
  const scriptPath = resolve(join(cavemanRoot, scriptName))
  const relScript = relative(cavemanRoot, scriptPath)
  if (relScript.startsWith('..') || relScript === '') {
    throw new Error('Invalid Caveman script path.')
  }
  if (!existsSync(scriptPath)) {
    throw new Error(`Caveman script not found at ${scriptPath}`)
  }

  const tmp = mkdtempSync(join(tmpdir(), 'theora-caveman-'))
  const inFile = join(tmp, 'in.txt')
  const outFile = join(tmp, 'out.txt')

  try {
    writeFileSync(inFile, input, 'utf-8')
    const args = [scriptPath, 'compress', '-f', inFile, '-o', outFile]
    if (variant === 'caveman-nlp' && eff.cavemanLanguage?.trim()) {
      args.push('-l', eff.cavemanLanguage.trim())
    }
    if (variant === 'caveman-mlm' && eff.cavemanMlmK !== undefined && Number.isFinite(eff.cavemanMlmK)) {
      args.push('-k', String(Math.round(eff.cavemanMlmK)))
    }

    execFileSync(python, args, {
      cwd: cavemanRoot,
      stdio: 'pipe',
      timeout: CAVEMAN_TIMEOUT_MS[variant],
    })

    if (!existsSync(outFile)) {
      throw new Error('Caveman compression produced no output file.')
    }
    return readFileSync(outFile, 'utf-8')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Caveman compression failed: ${msg}`)
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

export async function maybeCompressContext(
  input: string,
  config: KbConfig,
): Promise<CompressContextResult> {
  loadEnv()
  const eff = getEffectiveContextCompression(config)

  if (eff.provider === 'none') {
    return { text: input, compression: null }
  }

  if (input.length < eff.minChars) {
    return { text: input, compression: null }
  }

  let output: string
  switch (eff.provider) {
    case 'token-company':
      output = await compressTokenCompany(input, eff)
      break
    case 'caveman-nlp':
      output = compressCaveman(input, eff, config, 'caveman-nlp')
      break
    case 'caveman-mlm':
      output = compressCaveman(input, eff, config, 'caveman-mlm')
      break
    case 'caveman-llm':
      output = compressCaveman(input, eff, config, 'caveman-llm')
      break
    default:
      return { text: input, compression: null }
  }

  return {
    text: output,
    compression: {
      provider: eff.provider,
      preChars: input.length,
      postChars: output.length,
    },
  }
}
