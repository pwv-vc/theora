export type Provider = 'openai' | 'openai-compatible' | 'anthropic'

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  'openai-compatible': 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
}
