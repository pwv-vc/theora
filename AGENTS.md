# AGENTS.md

Quick reference for humans and AI agents. Full docs: [docs/](docs/).

**Important:** Check [.commandcode/taste/](.commandcode/taste/) for learned project preferences before making changes.

## Key files

- **CLI entry:** `src/index.ts`
- **Web server:** `src/web/server.ts`
- **Core lib:** `src/lib/ask.ts`, `src/lib/wiki.ts`, `src/lib/ingest.ts`, `src/lib/config.ts`
- **Commands:** `src/commands/`
- **Web routes:** `src/web/routes/`

## Quick reference

- **DRY:** Business logic in `src/lib/` — web (`src/web/`) and CLI (`src/commands/`) must not duplicate it
- **KB paths:** CLI `theora`; metadata dir `.theora/` (config, theme, tags)
- **Web stack:** Hono + `@hono/node-server`, HTMX, Tailwind — not Next.js

## Stack

TypeScript, pnpm, tsup, vitest, Commander, clack, ora, picocolors.

## Project identity

- **CLI:** `theora` (Max Headroom reference + "oracle")
- **Brand:** Retro-futuristic / Max Headroom visual language
