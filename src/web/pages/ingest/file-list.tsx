/** @jsxImportSource hono/jsx */
import { SectionLabel } from "../ui/index.js";

export function FileList() {
  return (
    <div id="file-list" class="hidden mb-5">
      <div class="flex items-center justify-between mb-2">
        <SectionLabel>Selected files</SectionLabel>
        <button
          type="button"
          onclick="clearAllFiles()"
          class="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
        >
          Clear all
        </button>
      </div>
      <div id="file-list-items" class="space-y-1.5" />
    </div>
  );
}
