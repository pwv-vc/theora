---
title: "stats"
description: "Show LLM usage statistics and track API calls over time"
date: 2026-04-15
category: commands
tags: [stats, command, cli, usage, analytics]
---

# stats

Show LLM usage statistics — track API calls, tokens, costs, and performance over time:

```bash
theora stats               # Show stats for last 30 days
theora stats --days 7      # Show stats for last 7 days
theora stats --json        # Output as JSON for scripting
```

The stats command tracks every LLM call made by Theora, including:

- **Total calls, tokens, and estimated cost** — cumulative usage across all operations
- **Breakdown by action** — see costs for compile, ask, search, etc.
- **Breakdown by model** — compare usage across different LLM models
- **Daily activity** — track usage patterns over the last 7 days

Stats are stored per-knowledge-base in `.theora/llm-log.jsonl` and persist across sessions.

## How Stats Collection Works

Every LLM call in Theora is automatically logged with detailed telemetry:

1. **Automatic Logging** — Each call to the LLM (compile, ask, search, etc.) records:
   - Timestamp and action type
   - Provider and model used
   - Input/output token counts
   - Duration (ms)
   - Estimated cost in USD

2. **Cost Estimation** — The system uses per-model pricing rates (OpenAI, Anthropic) to calculate estimated costs based on actual token usage.

3. **Log Storage** — Stats are appended to `.theora/llm-log.jsonl` as newline-delimited JSON, making them easy to parse and durable across sessions.

4. **Aggregation** — The `stats` command reads all log entries, filters by date range, and aggregates into summary statistics grouped by action, model, and day.
