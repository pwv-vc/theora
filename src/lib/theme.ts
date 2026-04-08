export const DEFAULT_THEME = `/* @theme theora */

@import 'default';

:root {
  --color-bg: #ffffff;
  --color-fg: #1a1a2e;
  --color-accent: #c0392b;
  --color-accent-light: #f9ebea;
  --color-muted: #6c757d;
  --color-border: #dee2e6;
  --font-heading: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --font-body: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --font-code: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
}

section {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-body);
  font-size: 28px;
  padding: 40px 60px;
  line-height: 1.5;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-fg);
  font-weight: 700;
  letter-spacing: -0.02em;
}

h1 {
  font-size: 2.2em;
  border-bottom: 3px solid var(--color-accent);
  padding-bottom: 0.2em;
  margin-bottom: 0.5em;
}

h2 {
  font-size: 1.6em;
  color: var(--color-accent);
  margin-bottom: 0.4em;
}

/* Title slide */
section.lead {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  background: var(--color-fg);
  color: var(--color-bg);
}

section.lead h1 {
  color: var(--color-bg);
  border-bottom-color: var(--color-accent);
  font-size: 2.6em;
}

section.lead h2 {
  color: var(--color-muted);
  font-weight: 400;
  font-size: 1.2em;
}

/* Lists */
ul, ol {
  margin-left: 0.5em;
}

li {
  margin-bottom: 0.3em;
}

li::marker {
  color: var(--color-accent);
}

/* Strong emphasis */
strong {
  color: var(--color-accent);
}

/* Code */
code {
  font-family: var(--font-code);
  background: var(--color-accent-light);
  color: var(--color-accent);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.85em;
}

pre {
  background: #f8f9fa;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1em;
}

pre code {
  background: none;
  color: var(--color-fg);
  padding: 0;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid var(--color-accent);
  padding-left: 1em;
  color: var(--color-muted);
  font-style: italic;
}

/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85em;
}

th {
  background: var(--color-accent);
  color: white;
  padding: 0.5em 0.8em;
  text-align: left;
}

td {
  padding: 0.4em 0.8em;
  border-bottom: 1px solid var(--color-border);
}

tr:nth-child(even) td {
  background: #f8f9fa;
}

/* Footer / page number */
section::after {
  font-size: 0.6em;
  color: var(--color-muted);
}

/* Images */
img {
  max-height: 70%;
  border-radius: 8px;
}

/* Links */
a {
  color: var(--color-accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`
