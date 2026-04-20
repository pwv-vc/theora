---
title: "kb create"
description: "Discover content on a topic using LLM curation"
date: 2026-04-15
category: commands
tags: [kb-create, command, cli, curation, discovery]
---

# kb create

Create a knowledge base definition by discovering content on a topic using LLM curation.

```bash
theora kb create --topic "U.S. Manned Space Program" --output space-kb.json
theora kb create --topic "Machine Learning" --max-items 30 --source-types web_page,pdf,youtube_video
theora kb create --topic "Renaissance Art" --distribution "mostly web pages, some PDFs, at least 2 images and 1 video"
theora kb create --topic "Climate Change" | theora ingest --from -
```

## Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--topic <topic>` | Yes | - | Topic to search for |
| `--source-types <types>` | No | All types | Comma-separated whitelist: web_page,pdf,image,video_file,youtube_video |
| `--distribution <desc>` | No | Balanced | Natural language distribution guidance |
| `--min-items <n>` | No | 10 | Minimum items to find |
| `--max-items <n>` | No | 10 | Maximum items to find |
| `--output <file>` | No | stdout | Output file path |
| `--verify-urls` | No | false | Verify URLs are accessible before including |

## Source Type Distribution

Use `--distribution` to guide the LLM in selecting content types:

```bash
# Examples:
--distribution "mostly web pages, some PDFs, at least one image and one video"
--distribution "equal mix of all types"
--distribution "primarily academic PDFs with a few overview videos"
--distribution "at least 5 images, rest can be web pages and PDFs"
```

The distribution is guidance, not a strict constraint. The LLM will aim to satisfy your preferences while respecting `--min-items`, `--max-items`, and `--source-types`.
