# Theora

<img width="1536" height="1024" alt="theora-card" src="https://github.com/user-attachments/assets/7586a5ee-e673-478c-8c6a-13f9a2fb1579" />

> _"She's the one who actually knows how everything works."_

## Purpose

**Theora** is an LLM-powered knowledge base: you ingest sources into `raw/`, run `theora compile` to build a structured wiki (sources, concepts, index), then `theora ask` to get answers filed into `output/` so every question compounds what the wiki knows.

## The name

Named after **Theora Jones**, the network controller at Network 23 in _Max Headroom: 20 Minutes into the Future_ — the person who actually understands the systems. It is also short for **the oracle**: a KB that synthesises and connects, not just stores. More context: [docs/the-name.md](docs/the-name.md).

## Inspiration

Theora was inspired by the idea of using LLMs to **compile and maintain** a personal knowledge base from raw material (articles, papers, images), then ask against it so answers feed back in — as discussed in [Karpathy’s “LLM Knowledge Bases” thread](https://x.com/karpathy/status/2039805659525644595). Longer write-up and references: [docs/inspiration.md](docs/inspiration.md).

## Quick start — first knowledge base (“Theora Documentation”)

**Prerequisites**

- **Node.js 20+** — see [docs/getting-started.md](docs/getting-started.md) for fnm/Homebrew setup.
- **An LLM API key** — [OpenAI](https://platform.openai.com/api-keys) (default) or [Anthropic](https://console.anthropic.com/).
- **Optional:**
  - `@marp-team/marp-cli` (PDF slides)
  - `matplotlib` (charts)
  - `yt-dlp` (YouTube caption ingest)
  - `ffmpeg` (Video screenshot frame extraction)

> For details, see [Getting started](docs/getting-started.md).

**Install Theora** (from a clone of this repo):

```bash
pnpm install
pnpm build
npm link
```

**Create a KB, ingest the bundled docs, compile, ask questions, and launch the local web server**

1. Create a directory for the KB and enter it:

   ```bash
   mkdir theora-docs && cd theora-docs
   ```

2. Initialise Theora with display name **Theora Documentation**:

   ```bash
   theora init "Theora Documentation"
   ```

3. Add your API key to **`theora-docs/.env`**, or put shared keys in **`~/.theora/.env`** (see [docs/getting-started.md](docs/getting-started.md)).

4. Ingest the documentation sources from your clone (use the **absolute path** to the repo’s **`docs/`** folder on your machine):

   ```bash
   theora ingest /absolute/path/to/theora/docs
   ```

5. Compile the wiki (requires API access):

   ```bash
   theora compile
   ```

6. Ask against the wiki (quote the question in **zsh** so `?` is not treated as a glob):

   ```bash
   theora ask "what is the inspiration for Theora?"
   theora ask "what types of files can I ingest?"
   theora ask what is Max Headroom
   theora ask how does knowledge compound
   ```

7. Start the web server:

   ```bash
   theora serve
   ```

   Default URL: `http://localhost:4000`. Use `theora serve --share` for LAN URLs and a terminal QR code.

**Full user guide**

All detailed topics (commands, providers, tags, slides, charts, architecture) live in **[docs/](docs/)** — the same folder you can ingest to turn the manual into your first wiki. Start at [docs/README.md](docs/README.md).
