---
title: "MCP Server"
description: "Expose your Theora knowledge base to AI agents via the Model Context Protocol"
date: 2026-04-25
category: integrations
tags: [mcp, agents, cursor, claude, integration]
---

# MCP Server

Theora includes a built-in [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that lets AI agents search, read, and ask questions against your knowledge base.

## What is MCP?

MCP is a standard protocol that lets AI applications (Cursor, Claude Desktop, VS Code Copilot, custom agents) connect to external tools and data sources. Theora's MCP server exposes your wiki as:

- **Tools** — actions the AI can invoke (search, ask, read articles, list tags/entities, stats)
- **Resources** — the wiki index for orientation

## Transports

Theora supports three ways to run the MCP server:

| Mode | Use case | How to start |
|-----------|----------|-------------|
| **stdio** | Local integrations (Cursor, Claude Desktop) | `theora-mcp` or `node dist/mcp/index.js` |
| **Standalone HTTP** | Dedicated MCP server (multiple KBs) | `theora-mcp --http` (default port 3100) |
| **Embedded HTTP** | Alongside the web UI | `theora serve` (MCP at `/mcp` on same port, default 4000) |

## Setup

### Build

```bash
pnpm build
```

This produces two binaries:
- `dist/index.js` — the main CLI (`theora`)
- `dist/mcp/index.js` — the MCP stdio server (`theora-mcp`)

### Cursor

Add to your Cursor MCP configuration (`.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "theora": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

Start the server first (from the KB root):

```bash
theora-mcp --http --port 3100
```

If your KB is not in the current directory, run from the target KB root or configure a global active KB with `theora kb use <path>`.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "theora": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

Start the server first (from the KB root):

```bash
theora-mcp --http --port 3100
```

### Standalone HTTP server

Run the MCP server as a standalone HTTP process — useful when you want to run multiple MCP servers for different KBs:

```bash
# Default port (3100)
theora-mcp --http

# Custom port
theora-mcp --http --port 3200

# Or via environment variable
MCP_PORT=3200 theora-mcp --http
```

The endpoint will be at `http://localhost:<port>/mcp` with health checks at `/health` and `/mcp/health`.

### Embedded HTTP (via `theora serve`)

When you run `theora serve`, the MCP endpoint is on the same port as the web UI (**4000** by default), at path `/mcp` (e.g. `http://localhost:4000/mcp`). A health check is available at `/mcp/health`. If you change the web port, use the matching host/port in the URL. Any MCP client that supports Streamable HTTP can connect to it.

## Port configuration

Both the web server and the standalone MCP server support configurable ports. Each resolves its port in the same priority order: **CLI flag → environment variable → KB config → default**.

### Web server (`theora serve`)

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `--port <n>` | `theora serve --port 5000` |
| 2 | `PORT` env var | `PORT=5000 theora serve` |
| 3 | `servePort` in `.theora/config.json` | `"servePort": 5000` |
| 4 | Default | **4000** |

### Standalone MCP (`theora-mcp --http`)

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `--port <n>` | `theora-mcp --http --port 3200` |
| 2 | `MCP_PORT` env var | `MCP_PORT=3200 theora-mcp --http` |
| 3 | `mcpPort` in `.theora/config.json` | `"mcpPort": 3200` |
| 4 | Default | **3100** |

### Per-KB port in config

Set custom ports in your KB config (`.theora/config.json`):

```json
{
  "servePort": 5000,
  "mcpPort": 3200
}
```

Or use `theora settings` to update them.

### Running multiple KBs

To expose multiple knowledge bases as separate MCP servers, run each from its KB root with a unique port:

```bash
cd ~/kbs/research && theora-mcp --http              # port 3100 (default)
cd ~/kbs/notes    && theora-mcp --http --port 3200  # port 3200
```

Or run full web + embedded MCP for each KB:

```bash
cd ~/kbs/research && theora serve                   # web 4000, MCP at /mcp
cd ~/kbs/notes    && theora serve --port 5000       # web 5000, MCP at /mcp
```

Then register each as a separate MCP server in your client config.

### Cursor config for multiple Theora MCP servers

When running multiple KB-backed MCP servers over HTTP, give each one a distinct server name in Cursor:

```json
{
  "mcpServers": {
    "theora-research": {
      "url": "http://localhost:3100/mcp"
    },
    "theora-notes": {
      "url": "http://localhost:3200/mcp"
    }
  }
}
```

Use server names that reflect purpose (`theora-work`, `theora-personal`, etc.) so it is obvious which KB you are querying.

### Trigger usage in Cursor chat

In prompts, explicitly reference the MCP server name when you want to target a specific KB:

- "Use `theora-research` and run `search` for 'transformer scaling laws'."
- "Use `theora-notes` and run `ask`: what did I conclude about hiring?"

To query both in one request:

- "Search both `theora-research` and `theora-notes` for 'MCP auth', then compare the results."

### Troubleshooting multiple MCP servers

- **Port already in use**: choose another port with `--port <n>` (or set `MCP_PORT`) and update the matching Cursor `url`.
- **Server not reachable**: confirm each process is running, then check `http://localhost:<port>/mcp/health`.
- **Wrong KB results**: start each server from the intended KB root (or set active KB with `theora kb use <path>` before launch).
- **Cursor not picking up config changes**: restart MCP servers and reload Cursor after editing `.cursor/mcp.json`.

## Available tools

| Tool | Description | Read-only |
|------|-------------|-----------|
| `search` | BM25 full-text search across the wiki | Yes |
| `ask` | AI-synthesized answer grounded in the wiki | No (invokes LLM) |
| `read-article` | Read the full content of a wiki article by path | Yes |
| `wiki-stats` | Article counts, word count, KB configuration | Yes |
| `list-tags` | All tags with article counts | Yes |
| `list-entities` | All named entities with occurrence counts | Yes |

### `search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search terms |
| `tag` | string | No | Filter results by tag |
| `entity` | string | No | Filter by entity (`type/name`) |
| `limit` | number | No | Max results (default: 10) |

### `ask`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The question to ask |
| `tag` | string | No | Filter wiki articles by tag |
| `entity` | string | No | Filter by entity (`type/name`) |
| `maxContext` | number | No | Max wiki articles in context |

### `read-article`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Article relative path from search results (e.g. `wiki/sources/my-article`, `wiki/concepts/my-concept`, or `output/my-query`). Omit the `.md` extension. |

The typical workflow is: use `search` to find articles by keyword, then `read-article` to fetch full text for specific results.

## Available resources

| Resource URI | Description |
|-------------|-------------|
| `theora://wiki/index` | Full wiki index listing all articles |

Individual wiki articles are accessed via the `read-article` tool rather than as MCP resources. This keeps the connection lightweight — large KBs can have hundreds of articles, and MCP clients subscribe to every listed resource on connect.

## Environment variables

The MCP server inherits Theora's standard environment:

- **LLM keys**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or provider-specific keys in `.env`
- **KB resolution**: Uses `requireKbRoot()` — works from within a KB directory or with a globally active KB (`theora kb use`)
- **Configuration**: Reads `.theora/config.json` for model, provider, search tuning, `servePort`, and `mcpPort` settings

### Port environment variables

These are defined as constants in `src/lib/config.ts` (`SERVE_PORT_ENV`, `MCP_PORT_ENV`) so they stay in sync across the codebase.

| Variable | Controls | Default | Config key |
|----------|----------|---------|------------|
| `PORT` | Web server port (`theora serve`) | 4000 | `servePort` |
| `MCP_PORT` | Standalone MCP HTTP port (`theora-mcp --http`) | 3100 | `mcpPort` |

Example:

```bash
PORT=5000 MCP_PORT=3200 theora serve
```
