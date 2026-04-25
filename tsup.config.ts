import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node20',
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'hono/jsx'
    },
  },
  {
    entry: ['src/mcp/index.ts'],
    outDir: 'dist/mcp',
    format: ['esm'],
    target: 'node20',
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.jsxImportSource = 'hono/jsx'
    },
  },
])
