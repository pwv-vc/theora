export type Provider = 'openai' | 'openai-compatible' | 'anthropic'

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  'openai-compatible': 'llama3.1:8b',
  anthropic: 'claude-sonnet-4-20250514',
}
