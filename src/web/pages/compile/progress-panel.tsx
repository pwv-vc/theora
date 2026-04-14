/** @jsxImportSource hono/jsx */
import { LogPanel, SectionLabel, StatusDot } from "../ui/index.js";

export function ProgressPanel() {
  return (
    <div id="progress-wrapper" class="hidden">
      <div class="flex items-center justify-between mb-3">
        <SectionLabel>Progress</SectionLabel>
        <div
          id="compile-status"
          class="flex items-center gap-2 text-zinc-500 text-xs"
        >
          <StatusDot id="status-dot" />
          <span>Running...</span>
        </div>
      </div>
      <LogPanel id="progress-log" />
    </div>
  );
}
