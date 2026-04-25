---
name: theora-research
description: >-
  Research topics and synthesize answers using the Theora knowledge base MCP server.
  Use when the user asks to research a topic, find information in their KB, answer
  questions from the wiki, or needs context from compiled sources and concepts.
---

# Theora KB Research

Use the Theora MCP server tools to research topics and answer questions grounded in the knowledge base.

## Prerequisites

A **Theora** MCP server must be registered in Cursor. The name you assign in `.cursor/mcp.json` (or `~/.cursor/mcp.json`) is **arbitrary and customer-specific** — e.g. `theora`, `theora-work`, `theora-research`, `acme-kb`. It does **not** have to be the string `theora`.

**Verify** the server is reachable by checking its health endpoint at `/mcp/health` (e.g. `http://localhost:4000/mcp/health`). It should return `{ "status": "ok" }`.

**One vs many:** If only one Theora server is connected, use it for all research steps. If **multiple** Theora servers are registered, follow the user’s disambiguation: they (or the prompt) should name the target, e.g. *"Ask `acme-kb` about …"* or *"Search both `theora-research` and `theora-notes` for …"*. For cross-KB questions, run `search` / `ask` (and reads) on each named server and **attribute quotes and citations to the server name** so answers do not conflate different knowledge bases.

## Workflow

### 1. Orient — understand the KB scope

Call `wiki-stats` to see what the KB contains (article count, sources vs concepts, word count).

If the topic is unclear, call `list-tags` and `list-entities` to see available coverage areas.

### 2. Search — find relevant articles

Call `search` with relevant terms. Use the `tag` or `entity` parameter to narrow results when the KB is large.

Review the returned titles, snippets, and scores. BM25 scores above 1.0 indicate strong matches.

### 3. Read sources — fetch article content

For promising search results, call `read-article` with the `path` from the search result:
- Sources: `wiki/sources/my-article`
- Concepts: `wiki/concepts/my-concept`
- Previous queries: `output/my-query`

The `relativePath` field in search results maps directly to the `read-article` `path` parameter (omit the `.md` extension).

### 4. Ask — get a synthesized answer

If the user needs a synthesized answer rather than raw articles, call `ask` with a well-formed question. The tool:
- Ranks wiki articles by relevance
- Builds context from top matches
- Streams an LLM-generated answer with citations

Use `tag` or `entity` filters when you know the relevant domain. Set `maxContext` to control how many articles the LLM sees (default: 20).

### 5. Cite — reference your sources

Always cite the wiki articles used. The `ask` tool returns source paths; `search` returns `relativePath` for each result. Reference these so the user can verify.

## Tips

- **Server name in the prompt:** When several Theora MCP servers exist, the clearest approach is to name the server (or “both”) in the user message before calling tools.
- **Search first, ask second.** Search is instant (BM25 index); ask invokes an LLM and costs tokens.
- **Use entity filters** for questions about specific people, places, orgs, or works — e.g., `entity: "person/alan-turing"`.
- **Chain queries.** Search broadly, read a few articles, then ask a focused question with the right tag filter.
- **Check previous queries.** Search with a broad query and look for `output/` paths to see if this question was already asked, then `read-article` to review them.
