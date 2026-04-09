/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

interface LayoutProps {
  title: string
  active: 'home' | 'concepts' | 'queries' | 'search' | 'ask' | 'compile' | 'ingest'
  children: Child
}

const wikiKeys = new Set(['home', 'concepts', 'queries'])

const navLinks = [
  { href: '/search', label: 'search', key: 'search' },
  { href: '/ask', label: 'ask', key: 'ask' },
  { href: '/ingest', label: 'ingest', key: 'ingest' },
  { href: '/compile', label: 'compile', key: 'compile' },
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

export function Layout({ title, active, children }: LayoutProps) {
  const isWikiActive = wikiKeys.has(active)

  return (
    <html lang="en" data-theme="broadcast">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Theora</title>
        <link rel="stylesheet" href="/static/styles.css" />
        {/* Runs before first paint to avoid flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theora-theme')||'broadcast';document.documentElement.setAttribute('data-theme',t);})();` }} />
        <script src="https://unpkg.com/htmx.org@2.0.4" defer />
      </head>
      <body class="bg-zinc-950 text-zinc-100 min-h-screen font-mono antialiased flex flex-col">
        {/* z-[20000] keeps header above form elements (z-10000) and scanline overlay (z-9999) */}
        <header class="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-[20000]">
          <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-8">
            <a href="/" class="text-red-500 font-bold text-sm tracking-widest uppercase glow shrink-0">theora</a>
            <nav class="flex gap-6 items-center">
              {/* Wiki dropdown */}
              <div class="relative group">
                <a
                  href="/"
                  class={
                    isWikiActive
                      ? 'text-zinc-100 text-sm'
                      : 'text-zinc-500 hover:text-zinc-100 text-sm transition-colors'
                  }
                >
                  wiki
                </a>
                <div class="absolute top-full left-0 hidden group-hover:block bg-zinc-900 border border-zinc-800 rounded-lg py-1 mt-2 min-w-[7rem] z-[20001] shadow-lg">
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
        <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer class="border-t border-zinc-800 bg-zinc-950 mt-auto">
          <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-red-500 font-bold text-xs tracking-widest uppercase glow">theora</span>
              <span class="text-zinc-500 text-xs">LLM-powered knowledge base</span>
            </div>
            <nav class="flex items-center gap-4">
              <a href="/" class={isWikiActive ? 'text-zinc-300 text-xs' : 'text-zinc-500 hover:text-zinc-300 text-xs transition-colors'}>wiki</a>
              {navLinks.map(link => (
                <a
                  key={link.key}
                  href={link.href}
                  class={
                    active === link.key
                      ? 'text-zinc-300 text-xs'
                      : 'text-zinc-500 hover:text-zinc-300 text-xs transition-colors'
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: `
          function setTheme(t) {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('theora-theme', t);
          }
          setTheme(localStorage.getItem('theora-theme') || 'max');
        ` }} />
      </body>
    </html>
  )
}
