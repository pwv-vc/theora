import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { readConfig } from './config.js'
import { loadEnv } from './env.js'
import { logLlmCall, estimateCost } from './llm-stats.js'

import type { Provider } from './types.js'

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

// --- OpenAI ---

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    loadEnv()
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set. Add it to .env in your knowledge base root.')
    }
    openaiClient = new OpenAI()
  }
  return openaiClient
}

async function openaiComplete(prompt: string, system: string, model: string, maxTokens: number, action: string = 'unknown', meta?: string | null): Promise<string> {
  const client = getOpenAI()
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

  const usage = response.usage
  const inputTokens = usage?.prompt_tokens ?? 0
  const outputTokens = usage?.completion_tokens ?? 0

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider: 'openai',
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
  })

  return response.choices[0]?.message?.content ?? ''
}

async function openaiStream(
  prompt: string,
  system: string,
  model: string,
  maxTokens: number,
  onText: (text: string) => void,
  action: string = 'unknown',
  meta?: string | null,
): Promise<string> {
  const client = getOpenAI()
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
    provider: 'openai',
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
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
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
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
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
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
  action: string = 'vision',
  meta?: string | null,
): Promise<string> {
  const client = getOpenAI()
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

  const usage = response.usage
  const inputTokens = usage?.prompt_tokens ?? 0
  const outputTokens = usage?.completion_tokens ?? 0

  logLlmCall({
    timestamp: new Date().toISOString(),
    action,
    meta,
    provider: 'openai',
    model,
    inputTokens,
    outputTokens,
    durationMs,
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
  })

  return response.choices[0]?.message?.content ?? ''
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
    estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic')
  }
  return block.text
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
  return openaiVision(prompt, images, system, model, maxTokens, action, meta)
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
  return openaiComplete(prompt, system, model, maxTokens, action, meta)
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
  return openaiStream(prompt, system, model, maxTokens, onText, action, meta)
}
