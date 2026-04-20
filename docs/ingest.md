---
title: "Ingest Command"
description: "Add files, URLs, and media to your knowledge base with Dublin Core metadata"
date: 2026-04-15
category: docs
tags: [ingest, import, dublin-core, metadata]
---

# Ingest Command

The `theora ingest` command adds source documents to your knowledge base. It can ingest individual files, directories, URLs, or bulk import from a structured JSON file.

## Basic Usage

```bash
# Ingest individual files
theora ingest document.pdf article.md

# Ingest a directory
theora ingest ./research-papers/

# Ingest URLs
theora ingest https://example.com/article

# Tag sources for organization
theora ingest ./nasa-docs/ --tag space-program
```

## Bulk Import with --from

The `--from` option enables bulk ingestion from a structured JSON file using [Dublin Core](https://www.dublincore.org/) metadata standards.

### Why Dublin Core?

[Dublin Core](https://www.dublincore.org/) is a widely-used metadata standard for describing digital resources. Using it provides:

- **Interoperability**: Works with library systems, digital repositories, and academic tools
- **Familiarity**: Researchers and librarians already know these fields
- **Standards compliance**: Aligns with best practices for metadata
- **Longevity**: Dublin Core has been in use since 1995 and is actively maintained

### Usage

```bash
# Import from KB JSON file
theora ingest --from kb.json --tag space-program

# Import from plain text file (one URL per line)
theora ingest --from urls.txt --tag nasa

# Import from stdin
cat kb.json | theora ingest --from -
```

### KB JSON Format

The KB JSON format uses Dublin Core metadata fields:

```json
{
  "name": "U.S. Manned Space Program",
  "description": "NASA human spaceflight history",
  "creator": "Your Name",
  "date": "2026-01-15",
  "language": "en",
  "subject": ["space", "nasa", "history"],
  "items": [
    {
      "url": "https://www.nasa.gov/project-mercury/",
      "title": "Project Mercury",
      "description": "First U.S. human spaceflight program",
      "creator": "NASA",
      "date": "2024-01-01",
      "language": "en",
      "subject": ["Mercury", "spaceflight"],
      "type": "web_page",
      "format": "text/html"
    }
  ]
}
```

### Required Fields

**Knowledge Base level:**
- `name` (string): Knowledge base name
- `items` (array): Array of resource items

**Item level:**
- `url` (string): Resource URL
- `title` (string): Resource title

### Optional Dublin Core Fields

**Knowledge Base:**
- `title`: Alternative to `name`
- `description`: Dublin Core description
- `creator`: Who created this KB
- `date`: Creation date (ISO 8601)
- `language`: Primary language (ISO 639)
- `publisher`: Publishing organization
- `rights`: Access rights statement
- `source`: Original source
- `subject`: Topic keywords/tags
- `coverage`: Spatial or temporal coverage

**Items:**
- `description`: Resource description
- `creator`: Author/creator
- `contributor`: Contributing entity
- `date`: Publication date
- `language`: Resource language
- `publisher`: Publishing organization
- `rights`: Access rights
- `source`: Original source
- `subject`: Topic keywords
- `coverage`: Spatial/temporal coverage
- `type`: Resource type
- `format`: Media format/MIME type
- `relation`: Related resources

### Plain Text Format

For simple use cases, you can use a plain text file with one URL per line:

```
# NASA resources
https://www.nasa.gov/project-mercury/
https://www.nasa.gov/gemini/
https://www.nasa.gov/mission/apollo-11/
```

Lines starting with `#` are treated as comments and ignored.

## Options

- `--tag <tag>`: Categorize all ingested sources with a tag (lowercase letters, numbers, and hyphens only)
- `--from <file>`: Ingest URLs from a KB JSON file or plain text file (use `-` for stdin)

## Examples

```bash
# Ingest with a tag
theora ingest ./papers/ --tag research

# Bulk import from JSON
theora ingest --from nasa-kb.json --tag space-program

# Import from text file
theora ingest --from urls.txt --tag articles

# Pipe from another command
cat sources.json | theora ingest --from - --tag imported
```

## Next Steps

After ingesting sources, compile them into your wiki:

```bash
theora compile
```

Then you can ask questions or search:

```bash
theora ask "What is the main topic?"
theora search "specific term"
```
