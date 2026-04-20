---
title: "compile"
description: "Process sources and build the wiki with summaries and concepts"
date: 2026-04-15
category: commands
tags: [compile, command, cli, build]
---

# compile

```bash
theora compile
```

The LLM reads every new source in `raw/`, writes a summary article for each, extracts key concepts into their own articles with backlinks, and rebuilds **`wiki/index.md`** plus the **lexical search index** (`.theora/search-index.json`). Run it again after ingesting new sources — it only processes what's new.

```bash
theora compile --sources-only    # skip concept extraction
theora compile --source foo.md   # recompile one raw source, skip concepts; rebuild wiki index + search index
theora compile --concepts-only   # delete and regenerate all concept articles from existing sources
theora compile --reindex         # rebuild wiki/index.md + .theora/search-index.json (no source/concept passes)
theora compile --force           # delete existing articles and recompile everything from scratch
theora compile --concurrency 5   # run 5 parallel LLM calls (faster, uses more API quota)
theora compile --concurrency 1   # sequential (useful for debugging or strict rate limits)
```

## Reindexing

After **every** compile path that finishes successfully (full compile, `--sources-only`, `--source`, `--concepts-only`, or `--reindex` alone), Theora rebuilds:

1. **`wiki/index.md`** — master Obsidian-style index: sources, concepts, optional mind maps / previous-queries sections, and the **Tags** grouping.
2. **`.theora/search-index.json`** — persisted **BM25** inverted index used by CLI `theora search` and the web wiki **Search** page.

Building **`.theora/search-index.json`** is **local only** (token counts and BM25 statistics from markdown on disk — no LLM). Regenerating **`wiki/index.md`** can still call the LLM for the **Overview** section when the wiki has at least one article. Use **`theora compile --reindex`** when you edited wiki or `output/` files by hand, added mind maps or filed answers, or search/index feel out of date — without re-running source or concept passes.

Use `--concepts-only` to regenerate all concept articles without re-summarizing sources — useful after adding new sources or when you want concepts to reflect the latest wiki content. It clears `wiki/concepts/` and re-extracts from your already-compiled source articles.

Use `--source <raw-file>` when you want to refresh exactly one raw source article without running a full source pass. It accepts either a bare filename (for example `foo.md`) or a path relative to `raw/` (for example `tag/foo.md`), overwrites the matching `wiki/sources/<slug>.md`, refreshes source-specific companion artifacts, skips concept extraction, and still rebuilds **`wiki/index.md`** and **`.theora/search-index.json`**. It is intentionally incompatible with `--force`, `--concepts-only`, and `--reindex`.

Use `--force` when you want to reprocess all sources with updated prompts or settings. It clears `wiki/sources/` and `wiki/concepts/` then runs a full compile. Your `raw/` files are never touched.

By default, `theora compile` runs **3 parallel LLM calls** at a time — safe for both OpenAI and Anthropic rate limits. Use `--concurrency` to tune this per-run, or set a permanent default with `theora init --concurrency <n>` (stored in `.theora/config.json`).

## Compile error handling

When compilation fails, Theora provides human-friendly error messages and persists detailed error logs for debugging:

```
✗ Compilation failed for youtube-3Co8Z8BQgWc.md

The file does not appear to be a valid video file.

Suggestions:
  • The file may not be a valid video file.
  • Check that the file extension matches the actual content (e.g., .mp4, .mov, .avi).
  • If this is a YouTube transcript markdown file, it should be processed as text, not video.

Error details saved to: /Users/you/.theora/logs/compile-youtube-3Co8Z8BQgWc-2026-04-13T08-05-12-000Z.log
You can review the full error log for more technical details.
```

**Error logs** are stored in `~/.theora/logs/` with one log file per failed compilation (not appended). Each log contains:
- Timestamp and source file
- Error type classification (ffmpeg, ffprobe, invalid_format, etc.)
- Full error message and command that failed
- Actionable suggestions for fixing the issue

At the end of a batch compile, if any sources failed, you'll see a summary:

```
⚠ Compiled 7/8 sources (1 failed)

1 compilation failure:
  • youtube-3Co8Z8BQgWc.md → /Users/you/.theora/logs/compile-youtube-3Co8Z8BQgWc-2026-04-13T08-05-12-000Z.log
```
