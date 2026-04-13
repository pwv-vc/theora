# U.S. Manned Space Program

A minimal knowledge base covering some of the history of U.S. human spaceflight from Project Mercury through the Space Shuttle program.

Contains 20 curated sources including official NASA web pages, historical documents (PDFs), mission reports, archival images, and videos from the NASA Image and Video Library and official YouTube channels.

## Setup

```bash
mkdir us-manned-space-program && cd us-manned-space-program
theora init "U.S. Manned Space Program"
```

Set environment variable:

```bash
export OPENAI_API_KEY=your_key_here
```

## Ingest from KB File

The easiest way to populate this knowledge base is using the `kb.json` file with the `--from` option:

```bash
theora ingest \
  --from ~/projects/pwv/theora/examples/us-manned-space-program/kb.json \
  --tag space-program
```

This imports all 20 items (web pages, PDFs, videos, and images) with their Dublin Core metadata.

### Alternative: Ingest Individual URLs

If you prefer to ingest URLs individually:

```bash
theora ingest \
  --tag space-program \
  'https://www.nasa.gov/project-mercury/' \
  'https://www.nasa.gov/gemini/' \
  'https://www.nasa.gov/mission/apollo-11/' \
  'https://www.nasa.gov/space-shuttle/'
```

### Extract URLs from KB File

To see what URLs are in the KB file:

```bash
jq -r '.items[].url' kb.json
```

Or to extract and ingest in one command:

```bash
jq -r '.items[].url' kb.json | xargs theora ingest --tag space-program
```

## Ask Questions

```bash
theora ask "who went to the moon and when"
theora ask "what does the earth look like from the moon"
theora ask "what does the term eagle mean"
```

> Notice that when asking about "Thhe Eagle" the knowledge base only knows about the to the Lunar Module, not the bird or the golf term. Because that is its defined knoedge.

## Launch Web UI

```bash
theora serve
```

Then open http://localhost:4000 in your browser.

## KB File Structure

The `kb.json` file follows the Dublin Core Metadata Element Set standard:

- **Top-level**: KB metadata (`name`, `title`, `description`, `created`, `publisher`, `subject`, `coverage`, etc.)
- **Items**: Array of sources with Dublin Core fields (`title`, `url`, `type`, `format`, `source`, `publisher`, `subject`, `coverage`, `description`, `language`, `access`)

This format enables interoperability with library systems, academic databases, and other knowledge management tools.
