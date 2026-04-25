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
- Support per-KB customizable theme stylesheets (e.g., .theora/theme.css) for slide/PDF output so users can customize fonts, colors, and styling. Confidence: 0.70
- Support `--output chart` to generate matplotlib PNG charts: LLM generates a self-contained Python script with data inlined as literals (no pandas, no external files), execute it with python3, save both .png and .py to output/. Confidence: 0.70
- Chart generation must support multiple series for line and bar charts (one series per company, topic, or concept when multiple are present); x-axis dates must be properly formatted using matplotlib date formatting (e.g., mdates). Confidence: 0.75

# security
See [security/taste.md](security/taste.md)
# error-handling
See [error-handling/taste.md](error-handling/taste.md)
# llm-integration
See [llm-integration/taste.md](llm-integration/taste.md)
# cli-design
See [cli-design/taste.md](cli-design/taste.md)
# observability
See [observability/taste.md](observability/taste.md)
# tagging
- Keep tags flat (simple strings like "ai", "transformers") — do not implement hierarchical/namespaced tags (e.g., "artist/prince"). Users can use conventions like "artist-prince" if they want structure. Confidence: 0.70
- Auto-tagging at ingest should be interactive by default (LLM suggests, user confirms/edits), with a --yes flag to skip confirmation for bulk/scripted use. Confidence: 0.65
- Tag vocabulary should live in .theora/tags.yaml, seeded at init time with predefined common tags based on KB category (e.g., research, music, business). Confidence: 0.65
- Enforce a consistent tag convention (e.g., always use hyphens or spaces, not both) to prevent duplicates like "sneaker pimps" vs "sneaker-pimps". Provide linting and auto-fix capabilities to detect and resolve duplicate tag variants. Confidence: 0.75

# wiki
See [wiki/taste.md](wiki/taste.md)
# web
See [web/taste.md](web/taste.md)
# workflow
- Always run build and typecheck as verification steps after making changes, and fix any errors found before considering the task complete. Confidence: 0.90
- When a task can be accomplished with existing CLI tools (e.g., jq, grep, sed), prefer showing the user how to use those tools rather than writing new code. Confidence: 0.90

# code-style
- Always ensure files end with a newline character (EOF newline). Confidence: 0.90
- Define variables, constants, and functions before they are used (no forward references). Confidence: 0.85
- Use shared library utility functions rather than duplicating logic inline — if a function exists in `src/lib/` or a similar shared module, import and use it instead of creating a duplicate implementation. Confidence: 0.85
- Maintain a single source of truth for data that must stay in sync across CLI and web interfaces — export constants like `VALID_EXTS` from a shared library module (e.g., `src/lib/ingest.ts`) and import them in both CLI and web code, rather than duplicating the list. Confidence: 0.80
- Prefer simpler function signatures without extra parameters when the additional complexity isn't necessary — avoid adding parameters just to support edge cases that can be handled differently. Confidence: 0.70

# mcp
- For Cursor and Claude Desktop MCP configuration, prefer URL-based setup (e.g., `"url": "http://localhost:3100/mcp"`) over command+args configuration — user explicitly requested URL config. Confidence: 0.80
- Add a `--debug` flag to both `theora serve` and `theora-mcp` that console-logs progress, steps, and response times so users can observe request lifecycle end-to-end. Confidence: 0.75
- MCP resource subscription should not subscribe to all wiki sources on initialization — instead, fetch sources on demand via search/read operations rather than subscribing to hundreds of URIs. Confidence: 0.80
- Session management logic should be shared between HTTP transport and MCP protocol layers, not duplicated across implementations. Confidence: 0.70
- Skills should support custom MCP server names and allow configuring multiple MCP servers — do not hardcode a server name like "theora" in skill instructions. Confidence: 0.75

# documentation
See [documentation/taste.md](documentation/taste.md)
