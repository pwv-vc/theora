/** @jsxImportSource hono/jsx */

export function StatusDot({ id }: { id?: string }) {
  return (
    <span
      id={id}
      class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
    />
  )
}
