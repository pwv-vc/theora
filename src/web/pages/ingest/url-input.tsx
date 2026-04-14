/** @jsxImportSource hono/jsx */
import { SectionLabel } from "../ui/index.js";

export function UrlInput() {
  return (
    <div class="mb-5">
      <label class="block mb-2">
        <SectionLabel>URLs</SectionLabel>
        <span class="text-zinc-600 text-xs ml-2">one per line</span>
      </label>
      <textarea
        id="url-input"
        rows={3}
        placeholder={"https://example.com/article\nhttps://arxiv.org/abs/..."}
        class="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-700 px-4 py-2.5 rounded-lg text-sm focus:border-red-600 focus:outline-none transition-colors font-mono resize-none"
      />
    </div>
  );
}
