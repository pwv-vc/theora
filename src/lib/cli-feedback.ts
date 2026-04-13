import ora, { type Ora } from 'ora'

export function stderrSpinner(text: string): Ora {
  return ora({ text, stream: process.stderr })
}

/** Single-line preview for stderr (questions, search queries, etc.). */
export function formatCliOneLinePreview(text: string, maxLen = 88): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return `${oneLine.slice(0, maxLen - 1)}…`
}
