import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { readConfig } from './config.js'
import { loadEnv } from './env.js'

import type { Provider } from './types.js'

export interface LlmOptions {
  system?: string
  maxTokens?: number
  model?: string
  provider?: Provider
}

function resolveProvider(options: LlmOptions): { provider: Provider; model: string } {
  const config = readConfig()
  const provider = options.provider ?? config.provider
  const model = options.model ?? config.model
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

async function openaiComplete(prompt: string, system: string, model: string, maxTokens: number): Promise<string> {
  const client = getOpenAI()
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  })
  return response.choices[0]?.message?.content ?? ''
}

async function openaiStream(
  prompt: string,
  system: string,
  model: string,
  maxTokens: number,
  onText: (text: string) => void,
): Promise<string> {
  const client = getOpenAI()
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

async function anthropicComplete(prompt: string, system: string, model: string, maxTokens: number): Promise<string> {
  const client = getAnthropic()
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
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
): Promise<string> {
  const client = getAnthropic()
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
): Promise<string> {
  const client = getOpenAI()
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
  return response.choices[0]?.message?.content ?? ''
}

async function anthropicVision(
  prompt: string,
  images: ImageInput[],
  system: string,
  model: string,
  maxTokens: number,
): Promise<string> {
  const client = getAnthropic()
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

  if (provider === 'anthropic') {
    return anthropicVision(prompt, images, system, model, maxTokens)
  }
  return openaiVision(prompt, images, system, model, maxTokens)
}

export async function llm(prompt: string, options: LlmOptions = {}): Promise<string> {
  const { provider, model } = resolveProvider(options)
  const system = options.system ?? 'You are a knowledge base assistant.'
  const maxTokens = options.maxTokens ?? 8192

  if (provider === 'anthropic') {
    return anthropicComplete(prompt, system, model, maxTokens)
  }
  return openaiComplete(prompt, system, model, maxTokens)
}

export async function llmStream(
  prompt: string,
  options: LlmOptions = {},
  onText: (text: string) => void,
): Promise<string> {
  const { provider, model } = resolveProvider(options)
  const system = options.system ?? 'You are a knowledge base assistant.'
  const maxTokens = options.maxTokens ?? 8192

  if (provider === 'anthropic') {
    return anthropicStream(prompt, system, model, maxTokens, onText)
  }
  return openaiStream(prompt, system, model, maxTokens, onText)
}
