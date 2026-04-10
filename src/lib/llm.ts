import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { readConfig } from './config.js'
import { loadEnv } from './env.js'
import { logLlmCall, estimateCost } from './llm-stats.js'

import type { Provider } from './types.js'

type OpenAiFamilyProvider = Extract<Provider, 'openai' | 'openai-compatible'>

export type LlmAction =
  | 'compile'
  | 'vision'
  | 'concepts'
  | 'ask'
  | 'slides'
  | 'chart'
  | 'lint'
  | 'rank'

export interface LlmOptions {
  system?: string
  maxTokens?: number
  model?: string
  provider?: Provider
  action?: LlmAction
  meta?: string | null
}

interface TokenUsageStats {
  inputTokens: number
  outputTokens: number
}

function resolveProvider(options: LlmOptions): { provider: Provider; model: string } {
  const config = readConfig()
  const provider = options.provider ?? config.provider

  // Check for action-specific model first, then fall back to default
  let model: string | undefined
  if (options.action && config.models?.[options.action]) {
    model = config.models[options.action]
  }
  // Fall back through: explicit > action > default config > hardcoded default
  model = options.model ?? model ?? config.model

  return { provider, model }
}

function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if ('type' in part && part.type === 'text' && 'text' in part && typeof part.text === 'string') {
        return part.text
      }
      return ''
    })
    .join('')
}

function readUsageNumber(
  usage: Record<string, unknown> | null | undefined,
  fieldNames: string[],
): number | undefined {
  if (!usage) return undefined

  for (const fieldName of fieldNames) {
    const value = usage[fieldName]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

export function normalizeOpenAiUsage(
  usage: Record<string, unknown> | null | undefined,
  inputText: string,
  outputText: string,
): TokenUsageStats {
  const inputTokens = readUsageNumber(usage, ['prompt_tokens', 'input_tokens', 'prompt_eval_count'])
    ?? estimateTextTokens(inputText)
  const outputTokens = readUsageNumber(usage, ['completion_tokens', 'output_tokens', 'eval_count'])
    ?? estimateTextTokens(outputText)

  return { inputTokens, outputTokens }
}

// --- OpenAI ---

const openAiClients: Partial<Record<OpenAiFamilyProvider, OpenAI>> = {}

function getOpenAI(provider: OpenAiFamilyProvider = 'openai'): OpenAI {
  if (!openAiClients[provider]) {
    loadEnv()
    if (provider === 'openai-compatible') {
      const compatibleBaseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim()
      if (!compatibleBaseUrl) {
        throw new Error('OPENAI_COMPATIBLE_BASE_URL not set. Add it to .env in your knowledge base root.')
      }
      const compatibleApiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim() || 'not-needed'
      openAiClients[provider] = new OpenAI({
        apiKey: compatibleApiKey,
        baseURL: compatibleBaseUrl,
      })
      return openAiClients[provider]
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set. Add it to .env in your knowledge base root.')
    }
    openAiClients[provider] = new OpenAI()
  }
  return openAiClients[provider]
}

async function openaiComplete(
  prompt: string,
  system: string,
  model: string,
  maxTokens: number,
  provider: OpenAiFamilyProvider = 'openai',
  action: string = 'unknown',
  meta?: string | null,
): Promise<string> {
  const client = getOpenAI(provider)
  const startTime = Date.now()
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  })
  const durationMs = Date.now() - startTime

  const outputText = extractTextContent(response.choices[0]?.message?.content)
  const { inputTokens, outputTokens } = normalizeOpenAiUsage(
    response.usage as Record<string, unknown> | undefined,
    `${system}\n${prompt}`,
    outputText,
  )
  const reportedModel = response.model ?? model

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider,
    model: reportedModel,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(reportedModel, inputTokens, outputTokens, provider),
  })

  return outputText
}

async function openaiStream(
  prompt: string,
  system: string,
  model: string,
  maxTokens: number,
  provider: OpenAiFamilyProvider = 'openai',
  onText: (text: string) => void,
  action: string = 'unknown',
  meta?: string | null,
): Promise<string> {
  const client = getOpenAI(provider)
  const startTime = Date.now()
  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  })

  let full = ''
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      onText(text)
      full += text
    }
  }

  const durationMs = Date.now() - startTime
  // Estimate tokens for streaming (OpenAI doesn't return usage in stream mode)
  const inputTokens = Math.ceil(prompt.length / 4) + Math.ceil(system.length / 4)
  const outputTokens = Math.ceil(full.length / 4)

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider,
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens, provider),
  })

  return full
}

// --- Anthropic ---

let anthropicClient: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    loadEnv()
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not set. Add it to .env in your knowledge base root.')
    }
    anthropicClient = new Anthropic()
  }
  return anthropicClient
}

async function anthropicComplete(prompt: string, system: string, model: string, maxTokens: number, action: string = 'unknown', meta?: string | null): Promise<string> {
  const client = getAnthropic()
  const startTime = Date.now()
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  const durationMs = Date.now() - startTime

  const usage = response.usage
  const inputTokens = usage?.input_tokens ?? estimateTextTokens(`${system}\n${prompt}`)
  const outputTokens = usage?.output_tokens ?? estimateTextTokens(blockText(response.content[0]))
  const reportedModel = response.model ?? model

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider: 'anthropic',
    model: reportedModel,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(reportedModel, inputTokens, outputTokens, 'anthropic'),
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic')
  }
  return block.text
}

async function anthropicStream(
  prompt: string,
  system: string,
  model: string,
  maxTokens: number,
  onText: (text: string) => void,
  action: string = 'unknown',
  meta?: string | null,
): Promise<string> {
  const client = getAnthropic()
  const startTime = Date.now()
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })

  let full = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onText(event.delta.text)
      full += event.delta.text
    }
  }

  const durationMs = Date.now() - startTime
  // Estimate tokens for streaming (Anthropic doesn't return usage in stream mode)
  const inputTokens = Math.ceil(prompt.length / 4) + Math.ceil(system.length / 4)
  const outputTokens = Math.ceil(full.length / 4)

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider: 'anthropic',
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens, 'anthropic'),
  })

  return full
}

// --- Vision ---

export interface ImageInput {
  base64: string
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
}

async function openaiVision(
  prompt: string,
  images: ImageInput[],
  system: string,
  model: string,
  maxTokens: number,
  provider: OpenAiFamilyProvider = 'openai',
  action: string = 'vision',
  meta?: string | null,
): Promise<string> {
  const client = getOpenAI(provider)
  const startTime = Date.now()
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    ...images.map((img): OpenAI.Chat.Completions.ChatCompletionContentPart => ({
      type: 'image_url',
      image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
    })),
    { type: 'text', text: prompt },
  ]

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content },
    ],
  })
  const durationMs = Date.now() - startTime

  const outputText = extractTextContent(response.choices[0]?.message?.content)
  const { inputTokens, outputTokens } = normalizeOpenAiUsage(
    response.usage as Record<string, unknown> | undefined,
    `${system}\n${prompt}`,
    outputText,
  )
  const reportedModel = response.model ?? model

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider,
    model: reportedModel,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(reportedModel, inputTokens, outputTokens, provider),
  })

  return outputText
}

async function anthropicVision(
  prompt: string,
  images: ImageInput[],
  system: string,
  model: string,
  maxTokens: number,
  action: string = 'vision',
  meta?: string | null,
): Promise<string> {
  const client = getAnthropic()
  const startTime = Date.now()
  const content: Anthropic.Messages.ContentBlockParam[] = [
    ...images.map((img): Anthropic.Messages.ImageBlockParam => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    })),
    { type: 'text', text: prompt },
  ]

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
  })
  const durationMs = Date.now() - startTime

  const usage = response.usage
  const inputTokens = usage?.input_tokens ?? 0
  const outputTokens = usage?.output_tokens ?? 0

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider: 'anthropic',
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens, 'anthropic'),
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic')
  }
  return block.text
}

function blockText(block: Anthropic.Messages.ContentBlock): string {
  return block.type === 'text' ? block.text : ''
}

// --- Public API ---

export async function llmVision(
  prompt: string,
  images: ImageInput[],
  options: LlmOptions = {},
): Promise<string> {
  const { provider, model } = resolveProvider(options)
  const system = options.system ?? 'You are a knowledge base assistant.'
  const maxTokens = options.maxTokens ?? 4096
  const action = options.action ?? 'vision'
  const meta = options.meta

  if (provider === 'anthropic') {
    return anthropicVision(prompt, images, system, model, maxTokens, action, meta)
  }
  return openaiVision(prompt, images, system, model, maxTokens, provider, action, meta)
}

export async function llm(prompt: string, options: LlmOptions = {}): Promise<string> {
  const { provider, model } = resolveProvider(options)
  const system = options.system ?? 'You are a knowledge base assistant.'
  const maxTokens = options.maxTokens ?? 8192
  const action = options.action ?? 'unknown'
  const meta = options.meta

  if (provider === 'anthropic') {
    return anthropicComplete(prompt, system, model, maxTokens, action, meta)
  }
  return openaiComplete(prompt, system, model, maxTokens, provider, action, meta)
}

export async function llmStream(
  prompt: string,
  options: LlmOptions = {},
  onText: (text: string) => void,
): Promise<string> {
  const { provider, model } = resolveProvider(options)
  const system = options.system ?? 'You are a knowledge base assistant.'
  const maxTokens = options.maxTokens ?? 8192
  const action = options.action ?? 'unknown'
  const meta = options.meta

  if (provider === 'anthropic') {
    return anthropicStream(prompt, system, model, maxTokens, onText, action, meta)
  }
  return openaiStream(prompt, system, model, maxTokens, provider, onText, action, meta)
}
