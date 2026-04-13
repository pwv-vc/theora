# Cli

- The CLI for this project is named `theora` (not `kb`) — named after Theora Jones from Max Headroom, and a play on "the oracle" of knowledge. Use `theora` in all command examples, error messages, and documentation. Confidence: 0.95
- The project's local data directory is `.theora` (not `.kb`) — use `.theora` in `init`, directory detection, and all file path references throughout the codebase. Confidence: 0.90
- Use pnpm as the package manager for CLI projects. Confidence: 1.00
- Use TypeScript for CLI projects. Confidence: 0.95
- Use tsup as the build tool for CLI projects. Confidence: 0.95
- Use vitest for testing CLI projects. Confidence: 0.95
- Use Commander.js for CLI command handling. Confidence: 0.95
- Use clack for interactive user input in CLI projects. Confidence: 0.95
- Check for existing CLI name conflicts before running npm link. Confidence: 0.95
- Organize CLI commands in a dedicated commands folder with each module separated. Confidence: 0.95
- Include a small 150px ASCII art welcome banner displaying the CLI name. Confidence: 0.95
- Use lowercase flags for version and help commands (-v, --version, -h, --help). Confidence: 0.85
- Start projects with version 0.0.1 instead of 1.0.0. Confidence: 0.85
- Version command should output only the version number with no ASCII art, banner, or additional information. Confidence: 0.90
- Read CLI version from package.json instead of hardcoding it in the source code. Confidence: 0.75
- Always use ora for loading spinners in CLI projects. Confidence: 0.95
- For batch progress spinners with parallel execution, use a two-line ora spinner: line 1 shows the count (e.g., "Compiling sources [3/40]"), line 2 shows all currently in-flight item names with a gray "→" prefix and cyan filenames (e.g., " → file1.md, file2.pdf"). Track in-flight items with a Set, updating the spinner on both task start and task completion. Confidence: 0.85
- Use picocolors for terminal string coloring in CLI projects. Confidence: 0.90
- Add Ink or terminui only when building full-screen or rich TUI features — not as default CLI dependencies. Confidence: 0.80
- Use ink-spinner for loading animations when an Ink-based CLI is in use. Confidence: 0.70
- Hide internal flags from help: .addOption(new Option('--local').hideHelp()). Confidence: 0.90
- Use pnpm.onlyBuiltDependencies in package.json to pre-approve native binary builds. Confidence: 0.60
- Use ANSI Shadow font for ASCII art at large terminal widths and ANSI Compact for small widths. Confidence: 0.85
- Use minimal white, gray, and black colors for ASCII art banners. Confidence: 0.85
- Check if package is publishable using `npx can-i-publish` before building or publishing. Confidence: 0.85
- Pluralize item type names in CLI output when the count is greater than 1 (e.g., "9 texts, 5 PDFs, 3 images" not "9 text, 5 PDF, 3 image"). Confidence: 0.75

# kb-create
- When implementing a `kb create` command that uses LLM to discover content, load the actual JSON schema from `schemas/knowledge-base.json` at runtime and embed it in the prompt. This ensures the LLM generates valid output that matches the schema used for validation. Confidence: 0.90
- Use natural language distribution guidance (e.g., "mostly web pages, some PDFs, at least one image") rather than rigid percentages or counts for specifying content type mix. The LLM can interpret this flexibly within min/max bounds. Confidence: 0.85
- Include URL verification as an optional flag (`--verify-urls`) that performs HEAD requests to check URL accessibility before including them in the output. Confidence: 0.80
- Support both file output (`--output`) and stdout (default) so the command can be piped to other commands like `theora ingest --from -`. Confidence: 0.90
- Generate topic-based unique IDs (e.g., `topic-001`, `topic-002`) for each item to ensure stable identifiers. Confidence: 0.75
- Default `--verify-urls` to true so URLs are verified during creation by default; users can opt-out with `--no-verify-urls` if needed. Confidence: 0.85
- In LLM prompts for URL discovery, explicitly instruct the model to only include URLs that actually exist and are accessible — do not invent, hallucinate, or assume URLs based on patterns. Confidence: 0.85
- When LLM-generated URLs are frequently hallucinated/fake, integrate a real web search tool (e.g., OpenAI's web_search tool) to discover actual URLs rather than relying on the LLM's training data. Confidence: 0.80
