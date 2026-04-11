/** @jsxImportSource hono/jsx */
import { getPkgVersion } from '../../../lib/pkg-version.js'
import { LogoIcon } from './logo-icon.js'

interface HeaderProps {
  active: 'home' | 'concepts' | 'queries' | 'search' | 'ask' | 'compile' | 'ingest' | 'stats-usage' | 'stats-logs' | 'settings' | 'error'
}

const assetVersion = getPkgVersion()

const wikiKeys = new Set(['home', 'concepts', 'queries'])
const ingestNavKeys = new Set(['ingest', 'compile'])
const adminKeys = new Set(['settings', 'stats-usage', 'stats-logs'])

const navLinks = [
  { href: '/search', label: 'search', key: 'search' },
  { href: '/ask', label: 'ask', key: 'ask' },
]

const wikiSubLinks = [
  { href: '/', label: 'sources', key: 'home' },
  { href: '/wiki/concepts', label: 'concepts', key: 'concepts' },
  { href: '/wiki/queries', label: 'queries', key: 'queries' },
]

const ingestSubLinks = [
  { href: '/ingest', label: 'upload', key: 'ingest' },
  { href: '/compile', label: 'compile', key: 'compile' },
]

const adminSubLinks = [
  { href: '/settings', label: 'settings', key: 'settings' },
  { href: '/stats/usage', label: 'usage', key: 'stats-usage' },
  { href: '/stats/logs', label: 'logs', key: 'stats-logs' },
]

const themes = [
  { id: 'broadcast', color: '#cc0066', title: 'BROADCAST — light mode' },
  { id: 'max',       color: '#ff0090', title: 'MAX — hot magenta on black' },
  { id: 'phosphor',  color: '#00ff00', title: 'PHOSPHOR — green CRT' },
  { id: 'neon',      color: '#00bbff', title: 'NEON — electric cyan' },
]

interface MobileMenuProps {
  active: string
}

function MobileMenu({ active }: MobileMenuProps) {
  return (
    <div
      data-mobile-menu
      class="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-[19999] opacity-0 invisible transition-all duration-200 sm:hidden"
    >
      <div class="flex flex-col h-full px-4 py-4">
        {/* Mobile menu header */}
        <div class="flex items-center justify-between mb-8">
          <a href="/" class="logo-link flex items-center gap-2" onclick="closeMobileMenu()">
            <LogoIcon />
            <span class="logo-text font-bold text-sm tracking-widest uppercase">theora</span>
          </a>
          <button
            type="button"
            data-mobile-menu-close
            class="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Close menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile navigation */}
        <nav class="flex flex-col gap-2 mb-8">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-2">Wiki</div>
          {wikiSubLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              class={active === link.key ? 'text-zinc-100 py-2 text-sm' : 'text-zinc-400 hover:text-zinc-100 py-2 text-sm transition-colors'}
              onclick="closeMobileMenu()"
            >
              {link.label}
            </a>
          ))}
          <div class="text-zinc-500 text-xs uppercase tracking-wider mt-4 mb-2">Actions</div>
          {navLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              class={active === link.key ? 'text-zinc-100 py-2 text-sm' : 'text-zinc-400 hover:text-zinc-100 py-2 text-sm transition-colors'}
              onclick="closeMobileMenu()"
            >
              {link.label}
            </a>
          ))}
          <div class="text-zinc-500 text-xs uppercase tracking-wider mt-4 mb-2">Ingest</div>
          {ingestSubLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              class={active === link.key ? 'text-zinc-100 py-2 text-sm' : 'text-zinc-400 hover:text-zinc-100 py-2 text-sm transition-colors'}
              onclick="closeMobileMenu()"
            >
              {link.label}
            </a>
          ))}
          <div class="text-zinc-500 text-xs uppercase tracking-wider mt-4 mb-2">Admin</div>
          {adminSubLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              class={active === link.key ? 'text-zinc-100 py-2 text-sm' : 'text-zinc-400 hover:text-zinc-100 py-2 text-sm transition-colors'}
              onclick="closeMobileMenu()"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile theme picker */}
        <div class="mt-auto">
          <div class="text-zinc-500 text-xs uppercase tracking-wider mb-3">Theme</div>
          <div class="flex flex-wrap gap-3">
            {themes.map(theme => (
              <button
                key={theme.id}
                data-theme-id={theme.id}
                title={theme.title}
                onclick={`setTheme('${theme.id}'); closeMobileMenu();`}
                class="theme-swatch w-8 h-8 rounded-full cursor-pointer hover:scale-110 focus:outline-none flex items-center justify-center"
                style={`background-color: ${theme.color}`}
              >
                <span class="sr-only">{theme.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Header({ active }: HeaderProps) {
  const isWikiActive = wikiKeys.has(active)
  const isIngestNavActive = ingestNavKeys.has(active)
  const isAdminActive = adminKeys.has(active)

  return (
    <header class="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-[20000]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-8">
        <a href="/" class="logo-link flex items-center gap-2 shrink-0">
          <LogoIcon />
          <span class="logo-text font-bold text-sm tracking-widest uppercase hidden sm:inline">theora</span>
        </a>

        {/* Mobile menu button */}
        <button
          type="button"
          data-mobile-menu-trigger
          class="sm:hidden ml-auto p-2 -mr-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Open menu"
          aria-expanded="false"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop navigation */}
        <nav class="hidden sm:flex gap-6 items-center">
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

          <div class="relative" data-dropdown="ingest">
            <button
              type="button"
              data-dropdown-trigger="ingest"
              aria-expanded="false"
              aria-haspopup="true"
              class={
                isIngestNavActive
                  ? 'text-zinc-100 text-sm flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
                  : 'text-zinc-500 hover:text-zinc-100 text-sm transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
              }
            >
              ingest
              <svg class="w-3 h-3 transition-transform duration-200" data-dropdown-arrow="ingest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              data-dropdown-menu="ingest"
              class="absolute top-full left-0 pt-2 z-[20001] opacity-0 invisible transition-all duration-200"
            >
              <div class="bg-zinc-900 border border-zinc-800 rounded-lg py-1 min-w-[8rem] shadow-lg">
                {ingestSubLinks.map(link => (
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

          <div class="relative" data-dropdown="admin">
            <button
              type="button"
              data-dropdown-trigger="admin"
              aria-expanded="false"
              aria-haspopup="true"
              class={
                isAdminActive
                  ? 'text-zinc-100 text-sm flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
                  : 'text-zinc-500 hover:text-zinc-100 text-sm transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-mono'
              }
            >
              admin
              <svg class="w-3 h-3 transition-transform duration-200" data-dropdown-arrow="admin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              data-dropdown-menu="admin"
              class="absolute top-full left-0 pt-2 z-[20001] opacity-0 invisible transition-all duration-200"
            >
              <div class="bg-zinc-900 border border-zinc-800 rounded-lg py-1 min-w-[8rem] shadow-lg">
                {adminSubLinks.map(link => (
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
        </nav>
        {/* Desktop theme picker */}
        <div class="hidden sm:flex ml-auto items-center gap-2.5">
          <span class="text-zinc-600 text-xs tracking-widest uppercase">theme</span>
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

      <MobileMenu active={active} />
    </header>
  )
}