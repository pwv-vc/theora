/** @jsxImportSource hono/jsx */
import { PwvLogo } from './logo.js'
import { GitHubIcon, CommandCodeIcon } from './icons/index.js'

export function Footer() {
  return (
    <footer class="border-t border-zinc-800 bg-zinc-900 mt-auto relative z-[20000]">
      <div class="max-w-5xl mx-auto px-6 py-10">
        {/* Top line: Pages links */}
        <div class="flex items-center gap-6 mb-6">
          <a href="/about" class="text-zinc-400 text-sm hover:text-[var(--color-accent)] transition-colors">About</a>
        </div>

        {/* Second line: Built with CommandCode (left) and GitHub (right) */}
        <div class="flex items-center justify-between mb-8">
          <a href="https://commandcode.ai" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-zinc-500 text-sm hover:text-[var(--color-accent)] transition-colors">
            <CommandCodeIcon size={16} />
            <span>Built with CommandCode</span>
          </a>
          <a href="https://github.com/pwv-vc/theora" target="_blank" rel="noopener noreferrer" class="text-zinc-400 hover:text-[var(--color-accent)] transition-colors" title="View on GitHub">
            <GitHubIcon size={20} />
          </a>
        </div>

        {/* Bottom section: PWV logo and Copyright (under the border) */}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t border-zinc-800">
          <div class="flex items-center gap-2">
            <PwvLogo width={20} height={20} />
            <span class="text-zinc-500 text-xs">Powered by <a href="https://www.pwv.com" target="_blank" rel="noopener noreferrer" class="text-zinc-300 font-medium hover:text-[var(--color-accent)] transition-colors" title="PwV (Preston-Werner Ventures)">PWV</a></span>
          </div>
          <div class="text-zinc-600 text-xs">
            © {new Date().getFullYear()} PWV Capital Management, LLC. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}