# search

**Lexical search** over compiled markdown: everything under **`wiki/`** (sources and concepts) and **`output/`** (filed answers, mind maps, and other generated markdown). This is **not** semantic Q&A — for that, use **`theora ask`**, which ranks articles with an LLM and synthesizes an answer.

```bash
theora search "attention mechanism"
theora search "transformer" -n 5
theora search "encoder" --tag transformers    # filter by tag
theora search anything --tags                 # list all tags
```

The **web wiki** (`theora serve`) exposes the same engine on the **Search** page.

## How search works

1. **Index** — On each [reindex](./compile.md#reindexing) (including any full compile that finishes with index rebuild), Theora writes **`.theora/search-index.json`**: stemmed tokens, per-field term counts, and BM25 corpus statistics. If that file is missing (for example an older KB created before this feature), run **`theora compile --reindex`** once.

2. **Tokenization** — Queries and documents are split on Unicode word boundaries; **English Porter stemming** is applied by default (configurable; changing **`search.stemming`** requires a reindex).

3. **Ranking** — **BM25** is computed separately for **title**, **body**, and **tags**, then combined using configurable **`search.fieldWeights`**. The combined score is multiplied by **recency** (from front matter `date`, `date_compiled`, or file mtime) and by **`search.outputWeight`** for articles under **`output/`**, so filed answers do not drown out sources and concepts.

4. **Snippets** — The UI shows a short excerpt from the line that best matches the query stems; literal highlighting uses **escaped** substrings so characters like `$` or `(` do not break matching.

5. **"Did you mean"** — If there are no hits or the top score is below **`search.weakScoreThreshold`**, optional **fuzzy** suggestions (Levenshtein on title/tag vocabulary) propose an alternate query. The CLI prints a line; the web UI links to the suggested search.

Optional tuning lives under **`search`** in **`.theora/config.json`** (merged with defaults on read). Useful keys: **`fieldWeights`** (`title`, `body`, `tags`), **`outputWeight`**, **`recencyHalfLifeDays`** (`0` disables recency decay), **`stemming`**, **`fuzzy`**, **`fuzzyMaxEdits`**, **`fuzzyMinTokenLength`**, **`weakScoreThreshold`**.

Use `--tag` to pre-filter articles before scoring — only articles with that tag are searched:

```bash
theora search "performance" --tag transformers
```

Use `--tags` to list every tag in the wiki (no query needed):

```bash
theora search anything --tags
```
