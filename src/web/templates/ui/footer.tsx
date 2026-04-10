/** @jsxImportSource hono/jsx */
import { PwvLogo } from './logo.js'

export function Footer() {
  return (
    <footer class="border-t border-zinc-800 bg-zinc-900 mt-auto relative z-[20000]">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <PwvLogo width={20} height={20} />
          <span class="text-zinc-400 text-xs">Powered by <a href="https://www.pwv.com" target="_blank" rel="noopener noreferrer" class="text-zinc-200 font-medium hover:text-[var(--color-accent)] transition-colors" title="PwV (Preston-Werner Ventures)">PWV</a></span>
        </div>
        <div class="text-zinc-500 text-xs">
          © {new Date().getFullYear()} PWV Capital Management, LLC. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
