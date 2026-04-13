# Tags

Tags are how you tell the wiki what things are about. Without tags, the LLM guesses — and it's decent at guessing. But when you're researching multiple topics at once, tags keep everything organized and findable.

## Two layers of tagging

**You tag at ingest time.** When you run `theora ingest paper.pdf --tag transformers`, that tag flows into the compile step. The LLM sees it and uses it to categorize the article — it'll include "transformers" in the frontmatter tags and use that context to write a better summary.

**The LLM also generates its own tags.** During compilation, the LLM reads each source and adds tags based on the content. If you tagged a paper "transformers" but it also covers attention mechanisms and encoder-decoder architectures, the LLM will add those too. Your tag seeds the categorization; the LLM expands it.

Both layers end up in the article's YAML frontmatter:

```yaml
---
title: "Attention Is All You Need"
tags: [transformers, attention-mechanism, encoder-decoder, self-attention]
---
```

## Why tags matter

Tags are the cross-cutting links in your wiki. The directory structure gives you two buckets — `sources/` and `concepts/` — but tags let you slice across both:

- **Filter search results**: `theora search "performance" --tag transformers` — only show results tagged "transformers"
- **See all tags**: `theora search anything --tags` — list every tag in the wiki
- **Index grouping**: `theora compile --reindex` rebuilds **`wiki/index.md`** (including the Tags section) and the **search index** so tags and articles stay aligned
- **Better Q&A**: when you `theora ask` a question, the LLM sees tags in the index and uses them to find relevant articles faster

## When to use tags

Use tags when you're researching multiple topics. If your knowledge base covers one narrow subject, tags are nice but not critical — the LLM will figure it out. But once you're ingesting papers on transformers _and_ diffusion models _and_ reinforcement learning, tags are what keep the wiki navigable.

Tag at ingest time, not after. It's one flag: `--tag transformers`. The earlier you tag, the better the LLM categorizes.

```bash
theora ingest ./papers/attention/*.pdf --tag transformers
theora ingest ./papers/diffusion/*.pdf --tag diffusion
theora ingest ./papers/rl/*.pdf --tag reinforcement-learning
theora ingest ./diagrams/*.png --tag architecture

theora search "scaling laws" --tag transformers
theora ask "compare the training approaches" --tag diffusion
```
