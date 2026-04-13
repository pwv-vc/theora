/** @jsxImportSource hono/jsx */

export function Prose({ html }: { html: string }) {
  return (
    <div
      class="prose prose-invert prose-zinc max-w-none prose-headings:font-mono prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-red-400 prose-a:no-underline hover:prose-a:text-red-300 prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-strong:text-zinc-100 prose-li:text-zinc-300 prose-blockquote:border-red-800 prose-blockquote:text-zinc-400 no-scanline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
