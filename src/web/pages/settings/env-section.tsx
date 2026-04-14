/** @jsxImportSource hono/jsx */
import type { SettingsInfo } from '../../../lib/settings.js'
import { StatusBadge, SourceBadge } from '../ui/index.js'

interface EnvironmentFileSectionProps {
  info: SettingsInfo
}

export function EnvironmentFileSection({ info }: EnvironmentFileSectionProps) {
  return (
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
  )
}

interface EnvironmentVariablesSectionProps {
  info: SettingsInfo
}

export function EnvironmentVariablesSection({ info }: EnvironmentVariablesSectionProps) {
  if (info.envKeys.length === 0) return null

  return (
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
  )
}
