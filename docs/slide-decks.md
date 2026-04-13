# Slide Decks

Theora can generate slide decks from your wiki using [Marp](https://marp.app/). The LLM structures its answer as slides — title slide, focused bullet points, section dividers, and a summary at the end. If you have `marp-cli` installed, the deck is automatically exported to PDF.

## Setup

```bash
npm install -g @marp-team/marp-cli
```

Without it, Theora still generates the `.marp.md` source file — you just won't get the PDF automatically.

## Generate slides

```bash
theora ask "present the key findings on attention mechanisms" --output slides
theora ask "compare transformer architectures" --output slides
theora ask "give a 10-slide overview of this research area" --output slides
```

This produces two files in `output/`:

- `<slug>.pdf` — the final slide deck (if marp-cli is installed)
- `<slug>.marp.md` — the Marp markdown source (always kept)

## View slides

- **PDF** — open in any viewer
- **Obsidian** — install the [Marp Slides](https://github.com/samuele-cozzi/obsidian-marp-slides) plugin to preview `.marp.md` files as slides
- **VS Code** — install the [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) extension
- **Manual export** — `marp output/my-slides.marp.md -o slides.html`

## Theming

`theora init` creates a default slide theme at `.theora/theme.css`. Customize it to control fonts, colors, and layout for all generated decks:

```css
:root {
  --color-accent: #c0392b;
  --color-fg: #1a1a2e;
  --color-bg: #ffffff;
  --font-heading: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-code: "JetBrains Mono", monospace;
}
```

If you delete `.theora/theme.css`, slides fall back to Marp's built-in default theme.

## Good slide prompts

```bash
# Good — specific
theora ask "present the 5 most important findings with evidence" --output slides
theora ask "create a tutorial on how attention mechanisms work" --output slides

# Less good — too vague
theora ask "tell me about transformers" --output slides
```
