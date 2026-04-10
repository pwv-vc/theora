/** @jsxImportSource hono/jsx */
import { PwvLogo } from './logo.js'

export function Footer() {
  return (
    <footer class="border-t border-zinc-800 bg-zinc-900 mt-auto relative z-[20000]">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <PwvLogo width={20} height={20} />
          <span class="text-zinc-400 text-xs">Powered by <span class="text-zinc-200 font-medium">PWV</span></span>
        </div>
        <div class="text-zinc-500 text-xs">
          © {new Date().getFullYear()} PWV Capital Management, LLC. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
