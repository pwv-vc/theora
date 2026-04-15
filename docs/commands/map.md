---
title: "map"
description: "Generate mind maps and focal graphs from your wiki"
date: 2026-04-15
category: commands
tags: [map, command, cli, visualization, mind-map]
---

# map

`theora map` builds a **focal graph** of your compiled wiki (sources, concepts, tags, entities, and links between them) and writes **[Markmap](https://markmap.js.org/repl)**-compatible markdown under `output/`. No headless browser is involved: you get a `.md` file you can open in Markmap tooling, IDEs, or static viewers.

**Interactive (default in a TTY)** — Run `theora map` with no focus flags. You choose a focal mode (concept, ontology + concept, source, or tag), then depth and max node count.

**Non-interactive** — Supply **exactly one** primary focus so nothing is prompted:

| Flag | Role |
| ---- | ---- |
| `--around <slug>` | Center on a wiki article slug (concept, source, or filed `output/` markdown). Slug: lowercase letters, digits, hyphens only (`^[a-z0-9][a-z0-9-]*$`). |
| `--tag <tag>` | **Without** `--around`: center on that tag. **With** `--around`: keep the article center but only expand through articles that have this tag. |
| `--entity <key>` | Center on an entity key as stored in front matter: `category:name` (e.g. `person:jane-doe`). |
| `--overview` | Center on a KB-wide hub graph; root label comes from `name` in `.theora/config.json`. |

Using more than one of `--overview`, `--entity`, `--around`, or tag-as-center (`--tag` without `--around`) is an error.

## Other options

| Option | Meaning |
| ------ | ------- |
| `--ontology <type>` | Restrict which concept articles participate. Values are the allowlist in [`src/lib/wiki.ts`](../../src/lib/wiki.ts) (`ONTOLOGY_TYPES`): core types (`person`, `organization`, `place`, …), creative subtypes (`movie`, `book`, `tv-series`, …), roles (`actor`, `musician`, `visual-artist`), and general KB types (`dataset`, `website`, `educational-organization`, …). |
| `--depth <n>` | Article hops from the focal point, 1–8 (default `2`). |
| `--max-nodes <n>` | Hard cap on graph size, 4–200 (default `48`). |
| `--expand-level <n>` | Optional Markmap hint `initialExpandLevel` in YAML front matter, 1–8. |
| `--output <basename>` | Write under `output/` using this basename only (safe join; extension added if omitted). |
| `--graph-json` | Also write a `.graph.json` next to the diagram. |
| `--no-interactive` | Never prompt; required in non-TTY environments unless you pass a focus flag above. |

## Examples

```bash
theora map                                              # TTY: guided focal + depth + max nodes
theora map --around attention-mechanisms                # article slug
theora map --around my-concept --tag ml                 # same center, tag-filtered expansion
theora map --tag architecture                           # center on tag
theora map --entity person:ada-lovelace
theora map --overview --depth 4 --max-nodes 64
theora map --around my-slug --expand-level 3 --graph-json
```

Saved files use YAML front matter like other filed output: **`title`** (`{focus} Mind Map`), **`type: mind-map`**, **`date`**, and optional **`markmap`** settings. They appear in the wiki listing and search like other `output/` articles. After adding or regenerating maps, run **`theora compile --reindex`** so **`wiki/index.md`** lists them under **Mind maps** (separate from **Previous Queries**) and **`.theora/search-index.json`** includes them for search.

The web wiki exposes the same graph as an interactive view at **`/wiki/map`**.
