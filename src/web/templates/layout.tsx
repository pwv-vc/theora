/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'
import { BroadcastWordmark } from './ui.js'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const storedTheme = localStorage.getItem('theora-theme');
                if (storedTheme === 'signal') document.documentElement.dataset.theme = 'signal';
              })();
            `,
          }}
        />
        <script src="https://unpkg.com/htmx.org@2.0.4" defer />
      </head>
      <body class="min-h-screen antialiased">
        <header class="border-b border-[var(--border-subtle)] bg-[rgba(8,9,12,0.58)] backdrop-blur-xl">
          <div class="app-shell flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center justify-between gap-6">
              <a href="/" class="flex items-center gap-3 text-[var(--text-primary)]">
                <BroadcastWordmark />
                <div class="hidden sm:block">
                  <div class="text-sm text-[var(--text-secondary)]">living wiki</div>
                </div>
              </a>
              <button
                type="button"
                class="console-chip sm:hidden"
                data-theme-toggle
              >
                palette
              </button>
            </div>
            <nav class="flex flex-wrap items-center gap-2 sm:gap-3">
              {navLinks.map(link => (
                <a
                  key={link.key}
                  href={link.href}
                  class={
                    active === link.key
                      ? 'console-chip console-chip-active'
                      : 'console-chip hover:text-[var(--text-primary)]'
                  }
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                class="hidden console-chip hover:text-[var(--text-primary)] sm:inline-flex"
                data-theme-toggle
              >
                toggle palette
              </button>
            </nav>
          </div>
        </header>
        <main class="app-shell py-6 sm:py-8">
          {children}
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const root = document.documentElement;

                const updateTagPicker = (picker) => {
                  if (!picker) return;
                  const options = Array.from(picker.querySelectorAll('input[type="checkbox"][name="tag"]'));
                  const selected = options.filter((input) => input.checked).map((input) => input.value);
                  const selectedContainer = picker.querySelector('[data-selected-tags]');
                  const countEl = picker.querySelector('[data-tag-count]');
                  const clearButton = picker.querySelector('[data-tag-clear]');
                  const details = picker.matches('details') ? picker : picker.querySelector('details');

                  if (selectedContainer) {
                    selectedContainer.innerHTML = '';
                    selected.forEach((tag) => {
                      const button = document.createElement('button');
                      button.type = 'button';
                      button.className = 'console-chip console-chip-active';
                      button.setAttribute('data-remove-tag', tag);
                      button.innerHTML = '<span>#' + tag + '</span><span aria-hidden="true">×</span>';
                      selectedContainer.appendChild(button);
                    });
                  }

                  if (countEl) {
                    countEl.textContent = selected.length > 0
                      ? selected.length + ' active'
                      : options.length + ' available';
                  }

                  if (clearButton) {
                    clearButton.toggleAttribute('hidden', selected.length === 0);
                  }

                  if (details instanceof HTMLDetailsElement && selected.length === 0) {
                    details.dataset.hasSelection = 'false';
                  } else if (details instanceof HTMLDetailsElement) {
                    details.dataset.hasSelection = 'true';
                  }
                };

                document.querySelectorAll('[data-tag-picker]').forEach((picker) => updateTagPicker(picker));

                document.addEventListener('input', (event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLElement)) return;
                  if (target.matches('[data-tag-filter]')) {
                    const picker = target.closest('[data-tag-picker]');
                    const query = String(target.value || '').trim().toLowerCase();
                    picker?.querySelectorAll('[data-tag-option]').forEach((option) => {
                      const matches = !query || option.getAttribute('data-tag-option')?.includes(query);
                      option.toggleAttribute('hidden', !matches);
                    });
                  }
                });

                document.addEventListener('change', (event) => {
                  const target = event.target;
                  if (target instanceof HTMLInputElement && target.name === 'tag') {
                    updateTagPicker(target.closest('[data-tag-picker]'));
                  }
                });

                document.addEventListener('click', (event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLElement)) return;

                  const themeToggle = target.closest('[data-theme-toggle]');
                  if (themeToggle) {
                    const nextTheme = root.dataset.theme === 'signal' ? 'crimson' : 'signal';
                    if (nextTheme === 'signal') root.dataset.theme = 'signal';
                    else delete root.dataset.theme;
                    localStorage.setItem('theora-theme', nextTheme);
                    return;
                  }

                  const clearButton = target.closest('[data-tag-clear]');
                  if (clearButton) {
                    const picker = clearButton.closest('[data-tag-picker]');
                    picker?.querySelectorAll('input[type="checkbox"][name="tag"]').forEach((input) => {
                      input.checked = false;
                    });
                    updateTagPicker(picker);
                    return;
                  }

                  const removeButton = target.closest('[data-remove-tag]');
                  if (removeButton) {
                    const picker = removeButton.closest('[data-tag-picker]');
                    const tag = removeButton.getAttribute('data-remove-tag');
                    const checkbox = picker?.querySelector('input[type="checkbox"][name="tag"][value="' + CSS.escape(tag || '') + '"]');
                    if (checkbox) checkbox.checked = false;
                    updateTagPicker(picker);
                    const trigger = picker?.querySelector('[data-tag-trigger]');
                    if (trigger instanceof HTMLElement) trigger.focus();
                    return;
                  }

                  const trigger = target.closest('[data-tag-trigger]');
                  if (trigger) {
                    const picker = trigger.closest('[data-tag-picker]');
                    if (!(picker instanceof HTMLDetailsElement)) return;
                    requestAnimationFrame(() => {
                      if (!picker.open) return;
                      const search = picker.querySelector('[data-tag-filter]');
                      if (search instanceof HTMLInputElement) search.focus();
                    });
                  }
                });

                document.addEventListener('keydown', (event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLElement)) return;
                  if (event.key !== 'Escape') return;
                  const picker = target.closest('[data-tag-picker]');
                  if (!(picker instanceof HTMLDetailsElement) || !picker.open) return;
                  picker.open = false;
                  const trigger = picker.querySelector('[data-tag-trigger]');
                  if (trigger instanceof HTMLElement) trigger.focus();
                });

                document.addEventListener('toggle', (event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLDetailsElement) || !target.matches('[data-tag-picker]')) return;
                  if (!target.open) return;
                  const search = target.querySelector('[data-tag-filter]');
                  if (search instanceof HTMLInputElement) search.focus();
                }, true);

                document.addEventListener('submit', (event) => {
                  const form = event.target;
                  if (!(form instanceof HTMLFormElement)) return;
                  form.querySelectorAll('[data-tag-picker]').forEach((picker) => {
                    if (picker instanceof HTMLDetailsElement) picker.open = false;
                  }
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
