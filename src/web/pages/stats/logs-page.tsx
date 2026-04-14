/** @jsxImportSource hono/jsx */
import type { LlmCallLog } from '../../../lib/llm-stats.js'
import type { KbConfig } from '../../../lib/config.js'
import { getKbName } from '../../../lib/config.js'
import { PageHeader } from '../ui/index.js'
import { LogTailer } from './log-tailer.js'

interface LogsPageProps {
  recentLogs: LlmCallLog[]
  config: KbConfig
}

export function StatsLogsPage({ recentLogs, config }: LogsPageProps) {
  const kbName = getKbName(config)
  return (
    <div>
      <PageHeader title="Logs" subtitle={`Live LLM call log for ${kbName}.`} />
      <LogTailer recentLogs={recentLogs} />
    </div>
  )
}
