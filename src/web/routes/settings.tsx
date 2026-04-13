/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { getSettingsInfo } from '../../lib/settings.js'
import { Layout } from '../pages/layout.js'
import { PageHeader, SectionHeader, Card } from '../pages/ui/index.js'

export const settingsRoutes = new Hono()

function StatusBadge({ exists }: { exists: boolean }) {
  return exists ? (
    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400 border border-green-700">
      ✓ Exists
    </span>
  ) : (
    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400 border border-red-700">
      ✗ Not found
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    kb: 'bg-blue-900/50 text-blue-400 border-blue-700',
    cwd: 'bg-purple-900/50 text-purple-400 border-purple-700',
    global: 'bg-amber-900/50 text-amber-400 border-amber-700',
    none: 'bg-red-900/50 text-red-400 border-red-700'
  }
  const labels: Record<string, string> = {
    kb: 'Knowledge Base',
    cwd: 'Current Directory',
    global: 'Global',
    none: 'None'
  }
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[source] || colors.none}`}>
      {labels[source] || source}
    </span>
  )
}

settingsRoutes.get('/', (c) => {
  const info = getSettingsInfo()
  const kbName = info.kbConfig?.name ?? 'Knowledge Base'

  const content = (
    <div>
      <PageHeader title="Settings" subtitle={kbName} />

      <SectionHeader title="Environment" count={info.envKeys.length} />

      {/* Knowledge Base Section */}
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4">Knowledge Base</h2>
        <div class="bg-zinc-800 rounded-lg border border-zinc-700 p-6 no-scanline">
          {info.kbRoot ? (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-zinc-500 text-sm">Root</span>
                <p class="font-mono text-sm text-zinc-300">{info.kbRoot}</p>
              </div>
              {info.kbConfig && (
                <>
                  <div>
                    <span class="text-zinc-500 text-sm">Name</span>
                    <p class="text-zinc-300">{info.kbConfig.name}</p>
                  </div>
                  <div>
                    <span class="text-zinc-500 text-sm">Provider</span>
                    <p class="text-zinc-300 capitalize">{info.kbConfig.provider}</p>
                  </div>
                  <div>
                    <span class="text-zinc-500 text-sm">Default Model</span>
                    <p class="font-mono text-sm text-zinc-300">{info.kbConfig.model}</p>
                  </div>
                  {info.kbConfig.provider === 'openai-compatible' && info.kbConfig.localModelPricing && (
                    <div>
                      <span class="text-zinc-500 text-sm">Local Pricing</span>
                      <p class="text-zinc-300">{info.kbConfig.localModelPricing.mode}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p class="text-zinc-500">Not in a knowledge base directory</p>
          )}
        </div>
      </section>

      {/* Environment File Section */}
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4">Environment File</h2>
        <div class="bg-zinc-800 rounded-lg border border-zinc-700 p-6 no-scanline">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-zinc-500 text-sm block">Global Path</span>
                <p class="font-mono text-sm text-zinc-300">{info.globalEnvPath}</p>
              </div>
              <StatusBadge exists={info.globalEnvExists} />
            </div>

            <div class="border-t border-zinc-700 pt-4">
              <span class="text-zinc-500 text-sm block mb-2">Active Source</span>
              <div class="flex items-center gap-3">
                <SourceBadge source={info.envLocation.source} />
                {info.envLocation.path && (
                  <span class="font-mono text-sm text-zinc-400">{info.envLocation.path}</span>
                )}
              </div>
              {!info.envLocation.exists && (
                <p class="text-zinc-500 text-sm mt-2">
                  Run "theora init" to create a global .env file
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Environment Variables Section */}
      {info.envKeys.length > 0 && (
        <section class="mb-8">
          <h2 class="text-lg font-semibold text-zinc-100 mb-4">Environment Variables (keys only)</h2>
          <div class="bg-zinc-800 rounded-lg border border-zinc-700 p-6 no-scanline">
            <ul class="space-y-2">
              {info.envKeys.map(key => (
                <li key={key} class="font-mono text-sm text-zinc-300 flex items-center gap-2">
                  <span class="text-zinc-500">•</span>
                  {key}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )

  return c.html(<Layout title={`Settings — ${kbName}`} active="settings">{content}</Layout>)
})
