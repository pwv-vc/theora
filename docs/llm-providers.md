# LLM Providers

Theora supports multiple LLM providers. OpenAI is the default.

| Provider            | Default Model              | API Key Variable            |
| ------------------- | -------------------------- | --------------------------- |
| `openai`            | `gpt-4o`                   | `OPENAI_API_KEY`            |
| `openai-compatible` | `llama3.1:8b`              | `OPENAI_COMPATIBLE_API_KEY` |
| `anthropic`         | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY`         |

Set the provider at init time:

```bash
theora init my-research --provider anthropic
theora init my-research --provider openai --model gpt-4o-mini
theora init my-research --provider openai-compatible --model llama3.1:8b
theora init my-research --concurrency 5
```

For `openai-compatible`, set `OPENAI_COMPATIBLE_BASE_URL` to your server's `/v1` endpoint. `OPENAI_COMPATIBLE_API_KEY` is optional and defaults to an empty value for local servers that do not require authentication.

For local `openai-compatible` models, Theora can estimate costs from runtime duration plus configurable machine-cost assumptions:

```json
{
  "provider": "openai-compatible",
  "model": "gemma-4-E2B-it",
  "localModelPricing": {
    "mode": "duration",
    "powerWatts": 250,
    "electricityUsdPerKwh": 0.15,
    "hardwareUsdPerHour": 0.35
  }
}
```

The fallback cost is:

```text
duration_hours * ((powerWatts / 1000 * electricityUsdPerKwh) + hardwareUsdPerHour)
```

Set `"mode": "zero"` if you want local models to report `$0` instead.

Or edit the KB-local `.theora/config.json` directly:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "compileConcurrency": 3,
  "conceptSummaryChars": 3000,
  "conceptMin": 5,
  "conceptMax": 10,
  "search": {
    "fieldWeights": { "title": 2.5, "body": 1, "tags": 1.5 },
    "outputWeight": 0.75,
    "recencyHalfLifeDays": 180
  }
}
```

| Key                   | Default | Description                                                                                                                                    |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `compileConcurrency`  | `3`     | Parallel LLM calls during compile                                                                                                              |
| `conceptSummaryChars` | `3000`  | Characters of each source article passed to the concept identification pass — higher values give the LLM more context but increase token usage |
| `conceptMin`          | `5`     | Minimum number of concepts to extract per compile run                                                                                          |
| `conceptMax`          | `10`    | Maximum number of concepts to extract per compile run                                                                                          |
| `search`              | (see defaults) | Optional BM25 / snippet tuning — full keys and behavior in [Search](commands.md#search)                                                                  |

## Per-Action Model Defaults

Each action uses a model optimized for its task. Cheaper models (`gpt-4o-mini`) are used for simpler tasks; full `gpt-4o` is reserved for quality-critical outputs.

| Action     | Default Model | Task                                       |
| ---------- | ------------- | ------------------------------------------ |
| `compile`  | `gpt-4o-mini` | Summarize text/PDF sources                 |
| `vision`   | `gpt-4o`      | Analyze images (needs vision capabilities) |
| `concepts` | `gpt-4o-mini` | Extract concept articles                   |
| `ask`      | `gpt-4o`      | Answer questions (quality matters)         |
| `rank`     | `gpt-4o-mini` | Rank article relevance (simple task)       |
| `chart`    | `gpt-4o`      | Generate chart Python code                 |
| `slides`   | `gpt-4o`      | Generate slide decks                       |
| `lint`     | `gpt-4o-mini` | Suggest improvements                       |

Override any action in your KB-local `.theora/config.json`:

```json
{
  "models": {
    "compile": "gpt-4o",
    "ask": "gpt-4o-mini"
  }
}
```

Unspecified actions keep their defaults.

API keys can live in either the knowledge base `.env` or the global `~/.theora/.env`. KB-local values override global ones. These files are gitignored by default when they live in the knowledge base.
