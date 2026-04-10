/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

interface HeaderProps {
  active: 'home' | 'concepts' | 'queries' | 'search' | 'ask' | 'compile' | 'ingest' | 'stats'
}

const wikiKeys = new Set(['home', 'concepts', 'queries'])

const navLinks = [
  { href: '/search', label: 'search', key: 'search' },
  { href: '/ask', label: 'ask', key: 'ask' },
  { href: '/ingest', label: 'ingest', key: 'ingest' },
  { href: '/compile', label: 'compile', key: 'compile' },
  { href: '/stats', label: 'stats', key: 'stats' },
]

const wikiSubLinks = [
  { href: '/', label: 'sources', key: 'home' },
  { href: '/wiki/concepts', label: 'concepts', key: 'concepts' },
  { href: '/wiki/queries', label: 'queries', key: 'queries' },
]

const themes = [
  { id: 'broadcast', color: '#cc0066', title: 'BROADCAST — light mode' },
  { id: 'max',       color: '#ff0090', title: 'MAX — hot magenta on black' },
  { id: 'phosphor',  color: '#00ff00', title: 'PHOSPHOR — green CRT' },
  { id: 'neon',      color: '#00bbff', title: 'NEON — electric cyan' },
]

export function Header({ active }: HeaderProps) {
  const isWikiActive = wikiKeys.has(active)

  return (
    <header class="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-[20000]">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-8">
        <a href="/" class="flex items-center gap-2 shrink-0">
          <img src="/static/logo.svg" width="28" height="28" alt="theora logo" />
          <span class="text-red-500 font-bold text-sm tracking-widest uppercase glow">theora</span>
        </a>
        <nav class="flex gap-6 items-center">
          {/* Wiki dropdown - improved with click and hover support */}
          <div class="relative" data-dropdown="wiki">
            <button
              type="button"
              data-dropdown-trigger="wiki"
              aria-expanded="false"
              aria-haspopup="true"
              class={
                isWikiActive
                  ? 'text-zinc-100 text-sm flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
                  : 'text-zinc-500 hover:text-zinc-100 text-sm transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
              }
            >
              wiki
              <svg class="w-3 h-3 transition-transform duration-200" data-dropdown-arrow="wiki" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Dropdown menu with padding area for better hover */}
            <div
              data-dropdown-menu="wiki"
              class="absolute top-full left-0 pt-2 z-[20001] opacity-0 invisible transition-all duration-200"
            >
              <div class="bg-zinc-900 border border-zinc-800 rounded-lg py-1 min-w-[8rem] shadow-lg">
                {wikiSubLinks.map(link => (
                  <a
                    key={link.key}
                    href={link.href}
                    class={
                      active === link.key
                        ? 'block px-3 py-1.5 text-xs text-zinc-100'
                        : 'block px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors'
                    }
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {navLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              class={
                active === link.key
                  ? 'text-zinc-100 text-sm'
                  : 'text-zinc-500 hover:text-zinc-100 text-sm transition-colors'
              }
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div class="ml-auto flex items-center gap-2.5">
          <span class="text-zinc-600 text-xs tracking-widest uppercase hidden sm:inline">theme</span>
          <div class="flex items-center gap-1.5">
            {themes.map(theme => (
              <button
                key={theme.id}
                data-theme-id={theme.id}
                title={theme.title}
                onclick={`setTheme('${theme.id}')`}
                class="theme-swatch w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-125 focus:outline-none"
                style={`background-color: ${theme.color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}