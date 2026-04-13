# Export Command

The `theora export` command exports your knowledge base to a structured JSON file using [Dublin Core](https://www.dublincore.org/) metadata standards.

## Why Export?

Exporting your knowledge base enables:

- **Backup**: Preserve your KB structure and metadata
- **Sharing**: Distribute curated resource collections to others
- **Migration**: Move between systems or create new KBs from existing ones
- **Archiving**: Create snapshots for version control or preservation
- **Integration**: Import into library systems, digital repositories, or academic tools

## Usage

```bash
# Export to stdout
theora export

# Export to file
theora export --output my-kb.json

# Export with specific format (default: json)
theora export --format json --output my-kb.json
```

## Output Format

The export produces a Dublin Core-aligned JSON file:

```json
{
  "name": "My Knowledge Base",
  "description": "Curated research on climate change",
  "creator": "Your Name",
  "date": "2026-01-15",
  "language": "en",
  "subject": ["climate", "environment", "research"],
  "items": [
    {
      "url": "https://example.com/article",
      "title": "Article Title",
      "description": "Article description",
      "creator": "Author Name",
      "date": "2024-01-01",
      "language": "en",
      "subject": ["tag1", "tag2"],
      "type": "web_page",
      "format": "text/html"
    }
  ]
}
```

## Dublin Core Metadata

The export uses [Dublin Core](https://www.dublincore.org/) metadata elements:

### Knowledge Base Fields

| Field | Dublin Core | Description |
|-------|-------------|-------------|
| `name` | `title` | Knowledge base name |
| `description` | `description` | KB description |
| `creator` | `creator` | Who created the KB |
| `date` | `date` | Creation date (ISO 8601) |
| `language` | `language` | Primary language (ISO 639) |
| `publisher` | `publisher` | Publishing organization |
| `rights` | `rights` | Access rights statement |
| `source` | `source` | Original source |
| `subject` | `subject` | Topic keywords/tags |
| `coverage` | `coverage` | Spatial/temporal coverage |

### Item Fields

| Field | Dublin Core | Description |
|-------|-------------|-------------|
| `url` | `identifier` | Resource URL |
| `title` | `title` | Resource title |
| `description` | `description` | Resource description |
| `creator` | `creator` | Author/creator |
| `contributor` | `contributor` | Contributing entity |
| `date` | `date` | Publication date |
| `language` | `language` | Resource language |
| `publisher` | `publisher` | Publishing organization |
| `rights` | `rights` | Access rights |
| `source` | `source` | Original source |
| `subject` | `subject` | Topic keywords |
| `coverage` | `coverage` | Spatial/temporal coverage |
| `type` | `type` | Resource type |
| `format` | `format` | Media format/MIME type |
| `relation` | `relation` | Related resources |

## Round-Trip Example

Export and re-import your knowledge base:

```bash
# Export current KB
theora export --output backup.json

# Create new KB from export
theora init my-new-kb
cd my-new-kb
theora ingest --from ../backup.json --tag imported

# Compile and verify
theora compile
```

## Integration with Other Tools

The Dublin Core format enables integration with:

- **Zotero**: Import/export research collections
- **DSpace**: Digital repository platform
- **Fedora**: Digital asset management
- **Omeka**: Web publishing platform
- **Archivematica**: Digital preservation
- **OpenRefine**: Data cleaning and transformation

## Options

- `-o, --output <file>`: Output file path (default: stdout)
- `-f, --format <format>`: Output format: json (default: json)

## See Also

- [`theora ingest`](./ingest.md) - Import sources from KB JSON
- [Dublin Core Metadata Initiative](https://www.dublincore.org/)
