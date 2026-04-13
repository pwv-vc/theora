/** @jsxImportSource hono/jsx */

export function DataIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"/>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <path d="M3 9h18"/>
      <path d="M3 15h18"/>
      <path d="M9 3v18"/>
    </svg>
  )
}
