---
title: "Agent Skills"
description: "Cursor agent skills for working with your Theora knowledge base"
date: 2026-04-25
category: integrations
tags: [skills, cursor, agents, mcp]
---

# Agent Skills

Theora ships with Cursor agent skills that teach AI agents how to use the MCP server effectively. Skills are workflow instructions — they don't contain logic, but tell the agent *when* and *how* to orchestrate the MCP tools.

## Included skills

### `theora-research`

**Trigger:** User asks to research a topic, find information, answer questions from the wiki, or needs context from compiled sources.

**Workflow:**
1. Orient — call `wiki-stats`, `list-tags`, `list-entities` to understand the KB
2. Search — find articles with `search` (optionally filtered by tag or entity)
3. Read — fetch full article content with `read-article`
4. Ask — get an AI-synthesized answer with `ask` for complex questions
5. Cite — reference the wiki articles used

### `theora-explore`

**Trigger:** User wants to browse their KB, see what it contains, explore topics, or get an overview.

**Workflow:**
1. Overview — `wiki-stats` for the big picture
2. Browse by topic — `list-tags` then `search` with tag filter
3. Browse by entity — `list-entities` then `search` with entity filter
4. Browse previous queries — `search` in the output directory, then `read-article` for details

## Location

Skills are stored in the project at:

```
skills/
├── theora-research/
│   └── SKILL.md
└── theora-explore/
    └── SKILL.md
```

Point Cursor at this folder if needed, or mirror under `.cursor/skills/` to match a local Cursor layout.

## Prerequisites

Skills require at least one Theora MCP server to be registered in your Cursor MCP configuration. The name you use in `mcpServers` is yours to choose (e.g. per customer or per KB) — you can register several, each on its own key. See [MCP Server](./mcp.md) for setup, ports, and multi-server `mcp.json` examples.

## Writing custom skills

You can add your own skills for specialized workflows — for example, a skill that always searches a specific tag domain, or one that cross-references multiple KBs.

Create a new directory under `skills/` (or `.cursor/skills/` if you prefer that layout) with a `SKILL.md` file:

```markdown
---
name: my-custom-skill
description: >-
  Description of what this skill does and when to use it.
---

# My Custom Skill

## Workflow
1. Step one...
2. Step two...
```

See the [Cursor Skills documentation](https://docs.cursor.com/context/skills) for the full authoring guide.
