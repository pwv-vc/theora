/** @jsxImportSource hono/jsx */
import { StatusDot } from "../ui/index.js";

export function StatusIndicator() {
  return (
    <div id="status" class="hidden mb-4">
      <div class="flex items-center gap-2 text-zinc-500 text-xs">
        <StatusDot id="status-dot" />
        <span id="status-text">Thinking...</span>
      </div>
    </div>
  );
}
