---
title: "Commands Overview"
description: "Complete reference for all Theora CLI commands with quick start guide"
date: 2026-04-15
category: commands
tags: [commands, cli, reference, overview]
---

# Commands

Theora's CLI provides commands for building and querying your knowledge base.

## Core Workflow

| Command | Purpose |
|---------|---------|
| [`ingest`](./ingest.md) | Add files, URLs, and media to your knowledge base |
| [`compile`](./compile.md) | Process sources, extract concepts, and build the wiki |

## Query & Explore

| Command | Purpose |
|---------|---------|
| [`ask`](./ask.md) | Ask questions using LLM-powered semantic search |
| [`search`](./search.md) | Lexical search over compiled markdown |
| [`map`](./map.md) | Generate mind maps and focal graphs |

## Utilities

| Command | Purpose |
|---------|---------|
| [`serve`](./serve.md) | Start the local web UI (includes MCP endpoint at `/mcp`) |
| [`lint`](./lint.md) | Health-check the wiki |
| [`stats`](./stats.md) | Show LLM usage statistics |
| [`tail`](./tail.md) | Watch LLM call logs in real-time |
| [`kb create`](./kb-create.md) | Discover content on a topic using LLM curation |

## Integrations

| Feature | Purpose |
|---------|---------|
| [MCP Server](../mcp.md) | Expose your KB to AI agents (Cursor, Claude Desktop) via MCP |
| [Agent Skills](../skills.md) | Cursor skills for KB research and exploration workflows |

## Quick Reference

```bash
# Build your knowledge base
theora ingest ~/papers/*.pdf --tag research
theora compile

# Query and explore
theora ask "what are the key findings?"
theora search "transformer architecture"
theora map --around my-topic

# Web interface (also serves MCP at /mcp)
theora serve

# Run as MCP stdio server (for Cursor/Claude Desktop)
theora-mcp
```
