---
title: "Theora Documentation"
description: "Complete user guide for Theora - a CLI tool for building and querying LLM-powered knowledge bases"
date: 2026-04-15
category: docs
tags: [documentation, guide, theora]
---

# Theora documentation (sample sources)

This folder is the **full user guide** for Theora, split into markdown files you can read on GitHub or **ingest into a knowledge base** to get a compiled wiki.

**Try it:** from a new KB directory (see the project root [README.md](../README.md)), run `theora ingest <path-to-this-folder>`, then `theora compile` and `theora serve`.

Files are copied into `raw/` by **basename** when ingested; use unique filenames across this tree.

## Contents

- [The name](the-name.md)
- [Inspiration](inspiration.md)
- [Why this works](why-it-works.md)
- [Getting started](getting-started.md)
- [Commands](commands.md) — ingest, compile, ask, serve, search, map, lint, stats, tail, export
- [Ingest command](ingest.md) — import sources with Dublin Core metadata
- [Export command](export.md) — export KB to Dublin Core JSON
- [Dublin Core schema](dublin-core-schema.md) — metadata standard for KB import/export
- [LLM providers](llm-providers.md)
- [Tags](tags.md)
- [Slide decks](slide-decks.md)
- [Charts](charts.md)
- [How it compounds](how-it-compounds.md)
- [MCP Server](mcp.md) — expose your KB to AI agents via the Model Context Protocol
- [Agent Skills](skills.md) — Cursor agent skills for researching and exploring your KB
