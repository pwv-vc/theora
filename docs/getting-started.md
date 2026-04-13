# Getting Started

## Prerequisites

**Required — Node.js 20+**

```bash
brew install fnm
eval "$(fnm env --use-on-cd)"   # add to ~/.zshrc for persistence
fnm install 22
fnm default 22
```

**Required — an LLM API key**

Get one from [OpenAI](https://platform.openai.com/api-keys) (default) or [Anthropic](https://console.anthropic.com/).

**Optional — slide deck export**

```bash
npm install -g @marp-team/marp-cli
```

Needed for `--output slides` to produce PDFs. Without it, the `.marp.md` source is still generated.

**Optional — chart generation**

```bash
pip3 install matplotlib
```

Needed for `--output chart`. Requires Python 3 (`brew install python` if not installed).

**Optional — YouTube captions-first ingest**

```bash
brew install yt-dlp
```

Needed for `theora ingest <youtube-url>`. Theora fetches captions and metadata only, then saves a transcript-backed markdown source into `raw/` without downloading the video file.

**Optional — ffmpeg - For processing video and audio files**

```bash
brew install ffmpeg
```

Needed for `theora ingest <video-file>`. Theora extracts audio, uses AI to transcribe, extracts sample frames from video, sends to vision LLM to describe, then combines transcript and descriptions to save a transcript-backed markdown source into `raw/`.

## Install

```bash
pnpm install
pnpm build
npm link
```

## Initialize a knowledge base

```bash
mkdir my-research && cd my-research
theora init my-research
```

`theora init` checks for optional dependencies and tells you what to install if anything is missing. It creates the directory structure and a `.env` file for your API keys:

```
raw/              Source documents you feed in
wiki/             LLM-compiled wiki (don't edit — the LLM owns this)
  index.md        Auto-maintained master index
  concepts/       Concept articles
  sources/        Source summaries
output/           Answers, slides, charts, and rendered outputs
.env              API keys
.theora/          Config, logs, and slide theme
```

## Global Configuration (Optional)

You can set up a global `.env` file at `~/.theora/.env` to share API keys across all knowledge bases:

```bash
theora init  # Creates ~/.theora/.env if it doesn't exist
```

**Environment File Hierarchy:**

Theora loads environment files in this order:

1. **Global `~/.theora/.env`** — Shared defaults across all KBs
2. **Current Directory `.env`** — For flexibility when running outside KB
3. **Knowledge Base `.env`** — Highest priority, KB-specific overrides
4. **System environment variables** — Available to the process before file loading

Later files override earlier ones. Unreadable `.env` files are skipped.

This means you can:

- Use `~/.theora/.env` for your main API keys (set once, use everywhere)
- Override with a KB-specific `.env` for special cases
- Check `theora settings` to see which .env file is active

## Active Knowledge Base

You can make Theora work from any directory by selecting a global active KB:

```bash
theora kb use ~/research/my-kb
theora kb list
theora kb use my-kb
theora kb remove my-kb
```

After that, KB-aware commands like `theora ask` and `theora compile` will use:

1. The nearest KB from your current directory
2. Your saved global `activeKb` from `~/.theora/config.json`

This means local discovery still wins when you are already inside a KB, but Theora can still run from anywhere once you have selected an active one.

## Add your API key

Edit `.env` in your knowledge base root:

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-...

# Or OpenAI-compatible
# OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
# OPENAI_COMPATIBLE_API_KEY=

# Or Anthropic
# ANTHROPIC_API_KEY=sk-ant-...
```
