import { z } from 'zod'

/**
 * Dublin Core-aligned Knowledge Base Schema
 *
 * Uses Dublin Core metadata standard for interoperability with library systems,
 * digital repositories, and academic tools. Dublin Core is a widely-adopted
 * standard for describing digital resources with 15 core elements.
 *
 * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 */

// Dublin Core authority classes for trust classification
export const AuthorityClassSchema = z.enum([
  'official',
  'institutional',
  'widely_recognized',
  'community',
  'unknown',
])

// Dublin Core item types
export const ItemTypeSchema = z.enum([
  'web_page',
  'pdf',
  'image',
  'audio_file',
  'video_file',
  'youtube_video',
  'dataset',
  'document',
  'other',
])

// Resource item with Dublin Core metadata
export const ResourceItemSchema = z.object({
  // Identification
  id: z.string().optional().describe('Stable identifier for the item'),
  url: z.union([z.string().url(), z.literal('')]).describe('Dublin Core: identifier - Resource URL (empty for local files)'),

  // Descriptive metadata
  title: z.string().describe('Dublin Core: title - Resource title'),
  description: z.string().optional().describe('Dublin Core: description - Resource description'),
  subject: z.array(z.string()).optional().describe('Dublin Core: subject - Topic keywords'),
  topic_tags: z.array(z.string()).optional().describe('Topic tags (legacy alias for subject)'),
  era_tags: z.array(z.string()).optional().describe('Temporal coverage tags'),

  // Creator metadata
  creator: z.string().optional().describe('Dublin Core: creator - Author/creator'),
  contributor: z.string().optional().describe('Dublin Core: contributor - Contributing entity'),
  publisher: z.string().optional().describe('Dublin Core: publisher - Publishing organization'),
  source: z.string().optional().describe('Dublin Core: source - Original source'),

  // Temporal/spatial metadata
  date: z.string().optional().describe('Dublin Core: date - Publication date (ISO 8601)'),
  coverage: z.string().optional().describe('Dublin Core: coverage - Spatial/temporal coverage'),

  // Technical metadata
  language: z.string().optional().describe('Dublin Core: language - Resource language (ISO 639)'),
  type: z.string().optional().describe('Dublin Core: type - Resource type'),
  item_type: ItemTypeSchema.optional().describe('Item type (legacy alias for type)'),
  format: z.string().optional().describe('Dublin Core: format - Media format/MIME type'),
  media_format: z.string().optional().describe('Media format (legacy alias for format)'),

  // Rights metadata
  rights: z.string().optional().describe('Dublin Core: rights - Access rights'),
  access: z.enum(['public', 'restricted', 'private']).optional().describe('Access level'),

  // Trust/authority
  authority_class: AuthorityClassSchema.optional().describe('Trust classification'),
  source_name: z.string().optional().describe('Source organization name'),

  // Relations
  relation: z.array(z.string()).optional().describe('Dublin Core: relation - Related resources'),

  // Internal fields for portable exports
  localPath: z.string().optional().describe('Relative path to file in export archive'),
})

// Knowledge base definition with Dublin Core metadata
export const KnowledgeBaseSchema = z.object({
  // Identification (name is required, title is alias)
  name: z.string().describe('Knowledge base name. Dublin Core: title'),
  title: z.string().optional().describe('Dublin Core: title - Alternative to name'),

  // Descriptive metadata
  description: z.string().optional().describe('Dublin Core: description - KB description'),
  subject: z.array(z.string()).optional().describe('Dublin Core: subject - Topic keywords'),

  // Creator metadata
  creator: z.string().optional().describe('Dublin Core: creator - Who created this KB'),
  publisher: z.string().optional().describe('Dublin Core: publisher - Publishing organization'),
  source: z.string().optional().describe('Dublin Core: source - Original source'),

  // Temporal metadata
  date: z.string().optional().describe('Dublin Core: date - Creation date (ISO 8601)'),
  coverage: z.string().optional().describe('Dublin Core: coverage - Spatial/temporal coverage'),

  // Technical metadata
  language: z.string().optional().describe('Dublin Core: language - Primary language (ISO 639)'),
  type: z.string().optional().describe('Dublin Core: type - Resource type'),
  format: z.string().optional().describe('Dublin Core: format - Media format'),

  // Rights metadata
  rights: z.string().optional().describe('Dublin Core: rights - Access rights statement'),

  // Items (required)
  items: z.array(ResourceItemSchema).min(1).describe('Resource items to ingest'),
})

// Export types
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>
export type ResourceItem = z.infer<typeof ResourceItemSchema>
export type AuthorityClass = z.infer<typeof AuthorityClassSchema>
export type ItemType = z.infer<typeof ItemTypeSchema>

/**
 * Validate and parse a knowledge base JSON object
 */
export function validateKnowledgeBase(data: unknown): KnowledgeBase {
  return KnowledgeBaseSchema.parse(data)
}

/**
 * Safe validation that returns success/failure
 */
export function safeValidateKnowledgeBase(data: unknown): { success: true; data: KnowledgeBase } | { success: false; error: z.ZodError } {
  const result = KnowledgeBaseSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Extract URLs from a knowledge base
 */
export function extractUrls(kb: KnowledgeBase): string[] {
  return kb.items.map(item => item.url)
}

/**
 * Convert legacy item_type to Dublin Core type
 */
export function itemTypeToDcType(itemType: ItemType): string {
  const mapping: Record<ItemType, string> = {
    web_page: 'Text',
    pdf: 'Text',
    image: 'Image',
    audio_file: 'Sound',
    video_file: 'MovingImage',
    youtube_video: 'MovingImage',
    dataset: 'Dataset',
    document: 'Text',
    other: 'PhysicalObject',
  }
  return mapping[itemType] ?? 'PhysicalObject'
}

/**
 * Convert Dublin Core type to item_type
 */
export function dcTypeToItemType(dcType: string): ItemType {
  const mapping: Record<string, ItemType> = {
    Text: 'web_page',
    Image: 'image',
    Sound: 'audio_file',
    MovingImage: 'video_file',
    Dataset: 'dataset',
    PhysicalObject: 'other',
  }
  return mapping[dcType] ?? 'other'
}
