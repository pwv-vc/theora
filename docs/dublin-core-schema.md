---
title: "Dublin Core Schema"
description: "Metadata standards for knowledge base import and export using Dublin Core"
date: 2026-04-15
category: docs
tags: [dublin-core, metadata, schema, standards]
---

# Dublin Core Schema

Theora uses [Dublin Core](https://www.dublincore.org/) metadata standards for knowledge base import and export. This ensures interoperability with library systems, digital repositories, and academic tools.

## What is Dublin Core?

[Dublin Core](https://www.dublincore.org/) is a widely-used metadata standard for describing digital resources. Developed in 1995 at a workshop in Dublin, Ohio, it provides a simple and flexible framework for describing resources across domains.

### Why Use Dublin Core?

- **Interoperability**: Works with library systems, digital repositories, and academic tools
- **Simplicity**: 15 core elements that are easy to understand
- **Flexibility**: Can be extended for specific domains
- **Standards compliance**: Aligns with best practices for metadata
- **Longevity**: Active since 1995 with ongoing maintenance
- **Tooling**: Existing validators, converters, and integrations

## Core Elements

The 15 Dublin Core elements used in Theora:

| Element | Description | Example |
|---------|-------------|---------|
| `title` | Name of the resource | "Project Mercury Overview" |
| `creator` | Author or creator | "NASA History Office" |
| `subject` | Topic keywords | ["space", "mercury", "nasa"] |
| `description` | Abstract or description | "Official overview of Project Mercury" |
| `publisher` | Publishing organization | "NASA" |
| `contributor` | Contributing entity | "Smithsonian Institution" |
| `date` | Publication date | "2024-01-15" |
| `type` | Resource type | "web_page", "pdf", "video" |
| `format` | Media format | "text/html", "application/pdf" |
| `identifier` | Unique identifier (URL) | "https://nasa.gov/..." |
| `source` | Original source | "NASA Technical Reports Server" |
| `language` | Language code | "en", "fr", "de" |
| `relation` | Related resources | ["https://related-url.com"] |
| `rights` | Access rights | "public", "restricted", "private" |
| `coverage` | Spatial/temporal coverage | "1960s", "United States" |

## JSON Schema

Theora uses a JSON schema that maps Dublin Core elements to a practical structure for knowledge bases:

### Knowledge Base Level

```json
{
  "name": "U.S. Manned Space Program",
  "description": "NASA human spaceflight history",
  "creator": "Your Name",
  "date": "2026-01-15",
  "language": "en",
  "publisher": "Your Organization",
  "rights": "CC BY-SA 4.0",
  "source": "https://github.com/yourorg/kb",
  "subject": ["space", "nasa", "history"],
  "coverage": "1958-2011",
  "items": [...]
}
```

### Item Level

```json
{
  "id": "usspace-001",
  "url": "https://www.nasa.gov/project-mercury/",
  "title": "Project Mercury",
  "description": "Official NASA overview of Project Mercury",
  "creator": "NASA",
  "date": "2024-01-01",
  "language": "en",
  "publisher": "NASA",
  "rights": "public",
  "source": "NASA Website",
  "subject": ["Mercury", "spaceflight", "NASA"],
  "coverage": "1958-1963",
  "type": "web_page",
  "format": "text/html"
}
```

## Field Mappings

### Dublin Core to Theora

| Dublin Core | Theora KB | Theora Item |
|-------------|-----------|-------------|
| `title` | `name` | `title` |
| `description` | `description` | `description` |
| `creator` | `creator` | `creator` |
| `date` | `date` | `date` |
| `language` | `language` | `language` |
| `publisher` | `publisher` | `publisher` |
| `rights` | `rights` | `rights` |
| `source` | `source` | `source` |
| `subject` | `subject` | `subject` |
| `coverage` | `coverage` | `coverage` |
| `type` | - | `type` / `item_type` |
| `format` | - | `format` / `media_format` |
| `identifier` | - | `url` |
| `contributor` | - | `contributor` |
| `relation` | - | `relation` |

## Usage Examples

### Creating a KB JSON File

```json
{
  "name": "Climate Change Research",
  "description": "Curated resources on climate science",
  "creator": "Dr. Jane Smith",
  "date": "2026-01-15",
  "language": "en",
  "subject": ["climate", "science", "environment"],
  "items": [
    {
      "url": "https://www.ipcc.ch/report/ar6/",
      "title": "IPCC Sixth Assessment Report",
      "description": "Comprehensive climate science assessment",
      "creator": "IPCC",
      "date": "2023-03-20",
      "publisher": "IPCC",
      "subject": ["climate", "science", "assessment"],
      "type": "web_page",
      "format": "text/html",
      "rights": "public"
    }
  ]
}
```

### Importing

```bash
# Import from KB JSON
theora ingest --from climate-kb.json --tag climate

# Import from plain text
theora ingest --from urls.txt --tag articles

# Import from stdin
cat kb.json | theora ingest --from - --tag imported
```

### Exporting

```bash
# Export to stdout
theora export

# Export to file
theora export --output my-kb.json

# Round-trip test
theora export --output backup.json
theora ingest --from backup.json --tag restored
```

## Schema Validation

Theora validates KB JSON files against the schema on import. Validation errors are displayed with helpful messages:

```
Error: Invalid KB JSON
- items[0].url: Invalid URL format
- items[1].title: Required field missing
```

## See Also

- [Export Command](./export.md) - Export knowledge base to JSON
- [Dublin Core Metadata Initiative](https://www.dublincore.org/) - Official Dublin Core documentation
- [JSON Schema](https://json-schema.org/) - JSON Schema specification
