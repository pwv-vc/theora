# cli-design
- Store tunable runtime parameters (e.g., compileConcurrency) in .theora/config.json with a sensible default, so they persist per-KB; CLI flags override config for one-off runs. Confidence: 0.75
- For I/O-bound parallel work (e.g., LLM API calls), use p-limit with Promise.all — not worker threads. Default concurrency of 3 is safe for both OpenAI and Anthropic rate limits. Confidence: 0.80
- Memoize repeated file reads (e.g., manifest, config) at module level when they are called inside parallel loops; invalidate the cache whenever the file is written. Confidence: 0.75
- Include a --fix flag on lint/check commands that auto-repairs fixable issues (broken links, missing metadata). Confidence: 0.65
- Run optional dependency checks at `init` time and report what's missing with exact install commands — non-blocking, just informational. Confidence: 0.75
- Keep source files short and self-contained; refactor when files grow too long by splitting into clearly named modules (e.g., extract helpers into lib/ files named for their purpose). Confidence: 0.80
- Add a --force flag to compile/build commands that clears previously generated output and reprocesses everything from scratch — needed when prompts or generation logic changes. Confidence: 0.75
- Add targeted regeneration sub-commands or flags for individual pipeline stages (e.g., `theora compile --concepts-only`) so users can re-run just one stage without reprocessing everything from scratch. Confidence: 0.70
