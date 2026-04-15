# ask

```bash
theora ask "what are the key differences between transformers and RNNs?"
theora ask "summarize the main findings across all papers"
theora ask "what open questions remain in this research area?"
theora ask "what did they contribute?" --entity person/alice-smith
```

In **zsh**, `?`, `*`, and `[` in an unquoted question are treated as globs, which can fail before `theora` runs (for example `theora ask what is pi?`). Quote the question, or pass it on **stdin** with `--stdin` so the shell never expands those characters:

```bash
theora ask --stdin <<< 'what is pi?'
printf '%s\n' 'Any question with ? * or [chars]?' | theora ask --stdin
```

`--stdin` reads the full question from stdin (trimmed of trailing newlines). Do not pass a positional question when using `--stdin`. Other flags such as `--no-file`, `--tag`, `--entity`, and `--output` work the same as with a normal `ask`.

## How ask works

Each `ask` builds context in two distinct tiers before calling the LLM:

### Tier 1 — Ranked wiki articles (sources + concepts)

The wiki index is read first. If you have 10 or fewer wiki articles, all of them are included. With more than 10, a fast LLM call acts as a relevance ranker — it sees every article's title and path, picks the most relevant (up to 15), and those full articles become the context. If the ranker fails, the first 15 articles are used as a fallback.

Use `--tag` to pre-filter wiki articles before ranking — only articles tagged with that value are considered:

```bash
theora ask "what are the scaling challenges?" --tag transformers
```

Use `--entity` to pre-filter by entity — only articles mentioning that entity are considered. Format is `type/name` (e.g., `person/john-doe`, `company/acme-corp`):

```bash
theora ask "what are their contributions?" --entity person/alice-smith
```

Use `--debug` to see which articles were selected by the ranker and how many were considered:

```bash
theora ask "what are the scaling challenges?" --debug
```

Debug output shows the tag filter (if any), entity filter (if any), total wiki articles considered, the ranked selection with relevance order, and any prior answers from `output/` that were included.

Use `--max-context <n>` to override the default 20 article limit for context:

```bash
theora ask "deep analysis question" --max-context 30
```

### Tier 2 — Prior answers (always included)

Every answer filed to `output/` is injected into context unconditionally — they bypass the ranker entirely. This is intentional: the ranker only sees titles and paths, not content. A prior answer titled _"what are the main themes?"_ would never be ranked as relevant to a different question, even if its content is directly useful. By always including prior answers, every query you've asked compounds into the next one.

**Scaling note:** The two tiers have different scaling characteristics. Wiki articles scale reasonably well — the ranker caps selection at 15 regardless of how many articles exist. Prior answers don't scale the same way: every single filed answer is always injected in full, unconditionally. At a handful of answers this is fine. At dozens it's manageable. At hundreds, the context window fills up before the LLM even sees your question. If you're doing heavy research with frequent `ask` calls, use `--no-file` for exploratory questions and only file answers that genuinely add durable knowledge. Splitting a large research area across multiple focused knowledge bases also helps — fewer prior answers per KB means more headroom per query.

Use `--no-file` to ask without filing the answer back:

```bash
theora ask "quick question" --no-file
```

## Output formats

### Markdown (default)

A written answer filed to `output/`:

```bash
theora ask "what are the main themes?"
```

### Slides

A Marp PDF deck:

```bash
theora ask "present the key findings" --output slides
```

Generates a [Marp](https://marp.app/) slide deck and converts it to PDF automatically if you have `marp-cli` installed. The `.marp.md` intermediate is always kept. See [Slide Decks](../slide-decks.md).

### Chart

A matplotlib PNG:

```bash
theora ask "line chart of revenue by month" --output chart
```

See [Charts](../charts.md).
