/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'

interface LayoutProps {
  title: string
  active: 'home' | 'search' | 'ask' | 'compile'
  children: Child
}

const navLinks = [
  { href: '/', label: 'wiki', key: 'home' },
  { href: '/search', label: 'search', key: 'search' },
  { href: '/ask', label: 'ask', key: 'ask' },
  { href: '/compile', label: 'compile', key: 'compile' },
]

export function Layout({ title, active, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Theora</title>
        <link rel="stylesheet" href="/static/styles.css" />
        <script src="https://unpkg.com/htmx.org@2.0.4" defer />
      </head>
      <body class="bg-zinc-950 text-zinc-100 min-h-screen font-mono antialiased">
        <header class="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
          <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-8">
            <a href="/" class="text-red-500 font-bold text-sm tracking-widest uppercase">theora</a>
            <nav class="flex gap-6">
              {navLinks.map(link => (
                <a
                  key={link.key}
                  href={link.href}
                  class={
                    active === link.key
                      ? 'text-zinc-100 text-sm'
                      : 'text-zinc-500 hover:text-zinc-300 text-sm transition-colors'
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main class="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
