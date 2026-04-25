---
name: theora-explore
description: >-
  Browse and explore a Theora knowledge base — list tags, entities, sources, concepts,
  and previous queries. Use when the user wants to see what their KB contains, browse
  articles, explore topics, or get an overview of their compiled wiki.
---

# Theora KB Explorer

Use the Theora MCP server to browse and understand the contents of a knowledge base.

## Prerequisites

A **Theora** MCP server must be registered in Cursor (stdio or HTTP). The key you give it in `.cursor/mcp.json` (or `~/.cursor/mcp.json`) is **your label** — e.g. `theora`, `theora-research`, `acme-wiki`, `customer-foo`. It does **not** have to be named `theora`.

**Verify it is a Theora server** by checking that its tools include at least: `wiki-stats`, `list-tags`, `list-entities`, `search`.

**One vs many:** If a single Theora server is available, use it for all tool and resource calls. If **multiple** Theora servers are registered (different KBs or customers), the user (or the prompt) should name which server to use, e.g. *"Use `theora-notes` and list tags"*. If they ask to explore **both** or **all** KBs, run the same workflow per server and **label every result with that server’s registered name** so outputs stay distinct.

## Exploration workflows

### Overview

1. Call `wiki-stats` for the high-level picture (article count, sources, concepts, words).
2. Call `list-tags` to see topic categories with counts.
3. Call `list-entities` to see named entities (people, places, orgs, creative works).

### Browse by topic

1. Pick a tag from `list-tags`.
2. Call `search` with `tag: "<tag-name>"` and an empty or broad query to list articles under that tag.
3. Read specific articles via resources: `theora://wiki/sources/{slug}` or `theora://wiki/concepts/{slug}`.

### Browse by entity

1. Pick an entity from `list-entities` (format: `type/name`, e.g. `person/ada-lovelace`).
2. Call `search` with `entity: "type/name"` to find all articles mentioning that entity.

### Browse previous queries

List `theora://output/*` resources to see what questions have been asked before and what answers were generated.

### Read the wiki index

Fetch the `theora://wiki/index` resource for the full wiki index — a markdown document listing all articles with descriptions.

## Presenting results

- When multiple Theora servers were used, state which **MCP server name** each list or stat came from.
- Group articles by type (sources vs concepts) when listing.
- Show tags and entity counts to give the user a sense of coverage.
- Link to specific articles by their wiki path so the user can follow up.
