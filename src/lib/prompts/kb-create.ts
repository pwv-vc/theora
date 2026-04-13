import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findKbRoot } from '../paths.js'

// Load the actual schema from schemas/knowledge-base.json
// Try to find it relative to KB root or project root
function loadKnowledgeBaseSchema(): unknown {
  const candidates = [
    // When running from source (KB root is project root)
    join(process.cwd(), 'schemas/knowledge-base.json'),
    // When inside a KB, look at project root
    ...(findKbRoot(process.cwd()) ? [join(findKbRoot(process.cwd())!, 'schemas/knowledge-base.json')] : []),
    // Try relative to this file (for built dist)
    join(new URL('.', import.meta.url).pathname, '../../../schemas/knowledge-base.json'),
  ]

  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      // Try next candidate
    }
  }

  // Fallback: return a minimal schema description
  return {
    description: 'Dublin Core-aligned Knowledge Base schema - could not load schema file',
    type: 'object',
    required: ['name', 'items'],
    properties: {
      name: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      created: { type: 'string', format: 'date' },
      language: { type: 'string' },
      publisher: { type: 'string' },
      subject: { type: 'array', items: { type: 'string' } },
      coverage: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['url', 'title'],
          properties: {
            id: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            format: { type: 'string' },
            source: { type: 'string' },
            publisher: { type: 'string' },
            authority_class: { type: 'string' },
            subject: { type: 'array', items: { type: 'string' } },
            coverage: { type: 'string' },
            language: { type: 'string' },
            access: { type: 'string' },
          },
        },
      },
    },
  }
}

const knowledgeBaseSchema = loadKnowledgeBaseSchema()

export function buildKbCreateSystemPrompt(): string {
  return `You are a research curator specializing in finding high-quality, authoritative content on any topic. Your task is to discover diverse, multi-modal resources from trusted sources.

CRITICAL URL REQUIREMENTS:
- You do NOT have web browsing capability - you cannot verify URLs
- ONLY include URLs you are absolutely certain exist from your training data
- Prefer stable, permanent URLs over likely-to-change article URLs
- When uncertain about a specific article URL, use the site's main page or search results page instead
- NEVER construct URLs by pattern - only use exact URLs you know exist

Guidelines:
- Prioritize official sources (.gov, .edu, major institutions, museums, archives)
- Include recognized experts and authoritative publications
- Prefer primary sources and peer-reviewed content when available
- Mix content types as specified by the user
- Avoid paywalled content unless clearly marked as freely accessible
- Include diverse perspectives and complementary resources
- Favor content with clear provenance and metadata

For each item, provide complete Dublin Core metadata:
- id: Unique identifier (e.g., topic-001, topic-002)
- title: Clear, descriptive title
- url: Direct, working URL
- type: web_page, pdf, image, video_file, youtube_video, etc.
- format: MIME type or format description
- source: Organization name
- publisher: Publishing entity
- authority_class: official, institutional, widely_recognized, community, unknown
- subject: Array of 2-5 topic keywords
- coverage: Temporal or spatial coverage (dates, eras, locations)
- description: Brief 1-2 sentence description
- language: ISO 639 code (e.g., "en")
- access: public, restricted, or private

For the knowledge base itself:
- name: Short name for the KB
- title: Full title
- description: 1-2 paragraph description of the KB scope
- created: ISO 8601 date (YYYY-MM-DD)
- language: Primary language
- publisher: Publishing entity
- subject: Array of topic keywords
- coverage: Temporal/spatial coverage`
}

export function buildKbCreateUserPrompt(params: {
  topic: string
  sourceTypes: string[]
  distribution: string
  minItems: number
  maxItems: number
  topicSlug: string
}): string {
  const { topic, sourceTypes, distribution, minItems, maxItems, topicSlug } = params

  return `Find and curate ${minItems} to ${maxItems} high-quality resources on the topic: "${topic}"

Allowed content types: ${sourceTypes.join(', ')}

Distribution guidance: ${distribution}

Return a valid JSON object matching the following JSON Schema:

${JSON.stringify(knowledgeBaseSchema, null, 2)}

Requirements:
- Include diverse content types as specified in the distribution guidance
- CRITICAL: Only include URLs you are certain exist - you cannot browse the web to verify
- Prefer main pages, archives, and stable URLs over specific article URLs that may have changed
- Prioritize authoritative sources (official, institutional, widely_recognized)
- Include 2-5 subject keywords per item
- Use ISO 8601 date format (YYYY-MM-DD) for created date
- Generate unique IDs in format: ${topicSlug}-001, ${topicSlug}-002, etc.
- The distribution guidance should be interpreted as: "aim for this mix" while staying within min/max bounds
- Ensure the response is valid JSON that parses with JSON.parse()`
}
