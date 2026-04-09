import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'hono/jsx'
  },
})
