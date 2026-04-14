/** @jsxImportSource hono/jsx */
import type { SettingsInfo } from '../../../lib/settings.js'
import { PageHeader, SectionHeader } from '../ui/index.js'
import { KnowledgeBaseSection } from './kb-section.js'
import { EnvironmentFileSection, EnvironmentVariablesSection } from './env-section.js'

interface SettingsPageProps {
  info: SettingsInfo
}

export function SettingsPage({ info }: SettingsPageProps) {
  const kbName = info.kbConfig?.name ?? 'Knowledge Base'

  return (
    <div>
      <PageHeader title="Settings" subtitle={kbName} />

      <SectionHeader title="Environment" count={info.envKeys.length} />

      <KnowledgeBaseSection info={info} />
      <EnvironmentFileSection info={info} />
      <EnvironmentVariablesSection info={info} />
    </div>
  )
}
