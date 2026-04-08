export type Provider = 'openai' | 'anthropic'

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
}
