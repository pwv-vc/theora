/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx'
import { Header } from './ui/header.js'
import { Footer } from './ui/footer.js'
import { getPkgVersion } from '../../lib/pkg-version.js'
import { MERMAID_THEME_PRESETS } from '../../lib/mermaid-theme.js'

interface LayoutProps {
  title: string
  active: 'home' | 'concepts' | 'queries' | 'search' | 'ask' | 'compile' | 'ingest' | 'stats-usage' | 'stats-logs' | 'settings' | 'error'
  children: Child
}

const themes = [
  { id: 'broadcast', color: '#cc0066', title: 'BROADCAST — light mode' },
  { id: 'max',       color: '#ff0090', title: 'MAX — hot magenta on black' },
  { id: 'phosphor',  color: '#00ff00', title: 'PHOSPHOR — green CRT' },
  { id: 'neon',      color: '#00bbff', title: 'NEON — electric cyan' },
]

export function Layout({ title, active, children }: LayoutProps) {
  const v = getPkgVersion()
  return (
    <html lang="en" data-theme="broadcast">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Theora</title>
        <link rel="stylesheet" href={`/static/styles.css?v=${v}`} />
        <link rel="icon" type="image/svg+xml" href={`/static/logo.svg?v=${v}`} />
        <link rel="shortcut icon" href={`/static/logo.svg?v=${v}`} />
        {/* Runs before first paint to avoid flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theora-theme')||'broadcast';document.documentElement.setAttribute('data-theme',t);})();` }} />
        <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous" defer />
        <script type="module" dangerouslySetInnerHTML={{ __html: `
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.14.0/dist/mermaid.esm.min.mjs';
          const PRESETS = ${JSON.stringify(MERMAID_THEME_PRESETS)};
          function buildMermaidConfig(themeId) {
            const preset = PRESETS[themeId] || PRESETS.broadcast;
            return {
              startOnLoad: true,
              theme: 'base',
              securityLevel: 'strict',
              themeVariables: Object.assign({ darkMode: preset.darkMode }, preset.themeVariables),
            };
          }
          function seedMermaidSources(root) {
            (root || document).querySelectorAll('.mermaid').forEach(function(el) {
              var text = el.textContent.trim();
              if (text && !el.dataset.mermaidSource) el.dataset.mermaidSource = text;
            });
          }
          seedMermaidSources(document);
          const themeId = document.documentElement.getAttribute('data-theme') || 'broadcast';
          mermaid.initialize(buildMermaidConfig(themeId));
          window.__mermaid = mermaid;
          window.renderMermaid = async function(el) {
            if (!el) return;
            el.querySelectorAll('pre > code.language-mermaid, pre.mermaid').forEach(function(node) {
              const div = document.createElement('div');
              const src = node.textContent.trim();
              div.className = 'mermaid';
              div.textContent = node.textContent;
              div.dataset.mermaidSource = src;
              node.replaceWith(div);
            });
            seedMermaidSources(el);
            const nodes = Array.from(el.querySelectorAll('.mermaid:not([data-processed])'));
            if (nodes.length > 0) {
              await mermaid.run({ nodes });
            }
          };
          window.refreshTheoraMermaid = async function() {
            const tid = document.documentElement.getAttribute('data-theme') || 'broadcast';
            mermaid.initialize(buildMermaidConfig(tid));
            const nodes = Array.from(document.querySelectorAll('.mermaid[data-mermaid-source]'));
            for (var i = 0; i < nodes.length; i++) {
              var n = nodes[i];
              n.removeAttribute('data-processed');
              n.textContent = n.dataset.mermaidSource;
            }
            if (nodes.length > 0) {
              await mermaid.run({ nodes: nodes });
            }
          };
        ` }} />
      </head>
      <body class="bg-zinc-950 text-zinc-100 min-h-screen font-mono antialiased flex flex-col">
        <Header active={active} />
        <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <Footer />
        <script dangerouslySetInnerHTML={{ __html: `
          function setTheme(t) {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('theora-theme', t);
            var r = window.refreshTheoraMermaid;
            if (typeof r === 'function') {
              r();
            }
          }
          setTheme(localStorage.getItem('theora-theme') || 'broadcast');

          // Mobile menu handling
          function openMobileMenu() {
            const menu = document.querySelector('[data-mobile-menu]');
            if (menu) {
              menu.classList.remove('opacity-0', 'invisible');
              menu.classList.add('opacity-100', 'visible');
              document.body.style.overflow = 'hidden';
            }
          }

          function closeMobileMenu() {
            const menu = document.querySelector('[data-mobile-menu]');
            if (menu) {
              menu.classList.add('opacity-0', 'invisible');
              menu.classList.remove('opacity-100', 'visible');
              document.body.style.overflow = '';
            }
          }

          document.addEventListener('DOMContentLoaded', function() {
            const trigger = document.querySelector('[data-mobile-menu-trigger]');
            const closeBtn = document.querySelector('[data-mobile-menu-close]');

            if (trigger) {
              trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openMobileMenu();
              });
            }

            if (closeBtn) {
              closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeMobileMenu();
              });
            }
          });

          // Dropdown menu handling with click and hover support
          (function() {
            const dropdowns = new Map();

            function getDropdown(id) {
              if (!dropdowns.has(id)) {
                const trigger = document.querySelector('[data-dropdown-trigger="' + id + '"]');
                const menu = document.querySelector('[data-dropdown-menu="' + id + '"]');
                const arrow = document.querySelector('[data-dropdown-arrow="' + id + '"]');
                if (trigger && menu) {
                  dropdowns.set(id, { trigger, menu, arrow, isOpen: false, hideTimeout: null });
                }
              }
              return dropdowns.get(id);
            }

            function showDropdown(id) {
              const dd = getDropdown(id);
              if (!dd) return;

              if (dd.hideTimeout) {
                clearTimeout(dd.hideTimeout);
                dd.hideTimeout = null;
              }

              // Close other dropdowns
              dropdowns.forEach((otherDd, otherId) => {
                if (otherId !== id && otherDd.isOpen) {
                  hideDropdown(otherId);
                }
              });

              dd.menu.classList.remove('opacity-0', 'invisible');
              dd.menu.classList.add('opacity-100', 'visible');
              if (dd.arrow) dd.arrow.classList.add('rotate-180');
              dd.trigger.setAttribute('aria-expanded', 'true');
              dd.isOpen = true;
            }

            function hideDropdown(id) {
              const dd = getDropdown(id);
              if (!dd) return;

              dd.hideTimeout = setTimeout(function() {
                dd.menu.classList.add('opacity-0', 'invisible');
                dd.menu.classList.remove('opacity-100', 'visible');
                if (dd.arrow) dd.arrow.classList.remove('rotate-180');
                dd.trigger.setAttribute('aria-expanded', 'false');
                dd.isOpen = false;
                dd.hideTimeout = null;
              }, 150);
            }

            // Initialize dropdowns
            document.querySelectorAll('[data-dropdown]').forEach(function(container) {
              const id = container.getAttribute('data-dropdown');
              const dd = getDropdown(id);
              if (!dd) return;

              // Trigger events
              dd.trigger.addEventListener('mouseenter', function() { showDropdown(id); });
              dd.trigger.addEventListener('mouseleave', function() { hideDropdown(id); });
              dd.trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (dd.isOpen) {
                  hideDropdown(id);
                } else {
                  showDropdown(id);
                }
              });

              // Menu events
              dd.menu.addEventListener('mouseenter', function() {
                if (dd.hideTimeout) {
                  clearTimeout(dd.hideTimeout);
                  dd.hideTimeout = null;
                }
              });
              dd.menu.addEventListener('mouseleave', function() { hideDropdown(id); });
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function(e) {
              const target = e.target;
              if (!target.closest('[data-dropdown]')) {
                dropdowns.forEach(function(dd, id) {
                  if (dd.isOpen) hideDropdown(id);
                });
              }
            });
          })();
        ` }} />
      </body>
    </html>
  )
}
