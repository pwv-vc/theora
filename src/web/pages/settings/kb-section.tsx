/** @jsxImportSource hono/jsx */
import type { SettingsInfo } from '../../../lib/settings.js'

function ConfigItem({ label, value }: { label: string; value: string | number | null }) {
  if (value === null) return null
  return (
    <div>
      <span class="text-zinc-500 text-sm">{label}</span>
      <p class="font-mono text-sm text-zinc-300">{value}</p>
    </div>
  )
}

function ConfigTextItem({ label, value, monospace = false }: { label: string; value: string | null; monospace?: boolean }) {
  if (value === null) return null
  return (
    <div>
      <span class="text-zinc-500 text-sm">{label}</span>
      <p class={monospace ? 'font-mono text-sm text-zinc-300' : 'text-zinc-300'}>{value}</p>
    </div>
  )
}

interface KnowledgeBaseSectionProps {
  info: SettingsInfo
}

export function KnowledgeBaseSection({ info }: KnowledgeBaseSectionProps) {
  return (
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-zinc-100 mb-4">Knowledge Base</h2>
      <div class="bg-zinc-800 rounded-lg border border-zinc-700 p-6 no-scanline">
        {info.kbRoot ? (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConfigItem label="Root" value={info.kbRoot} />
            {info.kbConfig && (
              <>
                <ConfigTextItem label="Name" value={info.kbConfig.name} />
                <ConfigTextItem label="Provider" value={info.kbConfig.provider.charAt(0).toUpperCase() + info.kbConfig.provider.slice(1)} />
                <ConfigItem label="Default Model" value={info.kbConfig.model} />
                {info.kbConfig.provider === 'openai-compatible' && info.kbConfig.localModelPricing && (
                  <ConfigTextItem label="Local Pricing" value={info.kbConfig.localModelPricing.mode} />
                )}
              </>
            )}
          </div>
        ) : (
          <p class="text-zinc-500">Not in a knowledge base directory</p>
        )}
      </div>
    </section>
  )
}
