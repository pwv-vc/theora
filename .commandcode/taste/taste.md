# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# cli
See [cli/taste.md](cli/taste.md)

# llm
- Default to OpenAI as the LLM provider when building LLM-powered tools. Confidence: 0.65
- Store API keys in .env files rather than expecting environment variables to be set globally. Confidence: 0.70
- Support multiple LLM providers (e.g., OpenAI and Anthropic) with a provider abstraction layer. Confidence: 0.65
- Define per-action model defaults optimized for each action's requirements and cost — use cheaper models (e.g., gpt-4o-mini) for simple tasks and reserve expensive models (e.g., gpt-4o) for complex reasoning. Confidence: 0.80

# naming
- Name CLI options and flags after what the user gets (the output), not the underlying technology (e.g., --output slides not --output marp). Confidence: 0.70

# environment
- User runs macOS and is frustrated with nvm — recommend fnm for Node.js version management. Confidence: 0.80
- Use a broad Node.js target (e.g., node20) in build configs rather than pinning to a specific version. Confidence: 0.65
- Suppress verbose output from .env loading libraries — do not log messages like "injected env (1) from .env" to the user. Confidence: 0.80

# output-formats
- Slide deck output should produce PDF as the final deliverable; Marp markdown is an intermediate step, not the end product. Confidence: 0.75
- Always pass `--no-stdin` when invoking marp programmatically (e.g., via execSync) — without it, marp v4+ hangs waiting for stdin input instead of processing the file argument. Confidence: 0.90
- Support per-KB customizable theme stylesheets (e.g., .kb/theme.css) for slide/PDF output so users can customize fonts, colors, and styling. Confidence: 0.70
- Support `--output chart` to generate matplotlib PNG charts: LLM generates a self-contained Python script with data inlined as literals (no pandas, no external files), execute it with python3, save both .png and .py to output/. Confidence: 0.70
- Chart generation must support multiple series for line and bar charts (one series per company, topic, or concept when multiple are present); x-axis dates must be properly formatted using matplotlib date formatting (e.g., mdates). Confidence: 0.75

# error-handling
- Validate required configuration (API keys, env vars) early with clear, actionable error messages instead of letting downstream services return cryptic errors. Confidence: 0.70
- Before executing optional runtime dependencies (e.g., Python modules like matplotlib), check if they are installed with a pre-flight check (e.g., `python3 -c "import matplotlib"`) and emit a clear install instruction (`pip3 install matplotlib`) rather than letting execution fail with a ModuleNotFoundError. Confidence: 0.85
- When multiple Python versions may be installed, probe each candidate (python3, python3.13, python3.12, python3.11, ...) for the required module (`import matplotlib`) and use the first that succeeds — don't assume the default `python3` binary has the needed packages. Confidence: 0.85
- Catch unhandled errors at the CLI entry point and display them as clean, formatted messages (e.g., using picocolors red) — never let raw Node.js stack traces with file:// paths reach the user. Confidence: 0.80

# llm-integration
See [llm-integration/taste.md](llm-integration/taste.md)
# cli-design
See [cli-design/taste.md](cli-design/taste.md)
# observability
- Track operational metrics (ingest time, AI cost, AI processing time) in stats for CLI tools that use LLM APIs. Confidence: 0.65

# wiki
See [wiki/taste.md](wiki/taste.md)
# web
See [web/taste.md](web/taste.md)
# documentation
See [documentation/taste.md](documentation/taste.md)
