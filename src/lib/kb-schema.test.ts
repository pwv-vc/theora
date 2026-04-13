import { describe, it, expect } from 'vitest'
import {
  validateKnowledgeBase,
  safeValidateKnowledgeBase,
  extractUrls,
  itemTypeToDcType,
  dcTypeToItemType,
  type KnowledgeBase,
} from './kb-schema.js'

describe('kb-schema', () => {
  describe('validateKnowledgeBase', () => {
    it('validates a minimal valid KB', () => {
      const kb = {
        name: 'Test KB',
        items: [{ url: 'https://example.com', title: 'Example' }],
      }
      expect(() => validateKnowledgeBase(kb)).not.toThrow()
    })

    it('validates a complete KB with all fields', () => {
      const kb: KnowledgeBase = {
        name: 'NASA History',
        title: 'NASA History',
        description: 'A knowledge base about NASA',
        creator: 'Test Author',
        date: '2026-01-15',
        language: 'en',
        publisher: 'Test Publisher',
        rights: 'CC BY-SA 4.0',
        source: 'https://example.com/source',
        subject: ['space', 'nasa'],
        coverage: '1958-1972',
        items: [
          {
            id: 'item-001',
            url: 'https://nasa.gov/project-mercury',
            title: 'Project Mercury',
            description: 'First US human spaceflight program',
            creator: 'NASA',
            date: '2024-01-01',
            language: 'en',
            publisher: 'NASA',
            rights: 'public',
            source: 'NASA Website',
            subject: ['Mercury', 'spaceflight'],
            coverage: '1958-1963',
            type: 'web_page',
            format: 'text/html',
          },
        ],
      }
      expect(() => validateKnowledgeBase(kb)).not.toThrow()
    })

    it('throws on missing required fields', () => {
      const kb = { items: [] }
      expect(() => validateKnowledgeBase(kb)).toThrow()
    })

    it('throws on empty items array', () => {
      const kb = { name: 'Test', items: [] }
      expect(() => validateKnowledgeBase(kb)).toThrow()
    })

    it('throws on invalid URL', () => {
      const kb = {
        name: 'Test',
        items: [{ url: 'not-a-url', title: 'Test' }],
      }
      expect(() => validateKnowledgeBase(kb)).toThrow()
    })
  })

  describe('safeValidateKnowledgeBase', () => {
    it('returns success for valid KB', () => {
      const kb = {
        name: 'Test KB',
        items: [{ url: 'https://example.com', title: 'Example' }],
      }
      const result = safeValidateKnowledgeBase(kb)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test KB')
      }
    })

    it('returns failure for invalid KB', () => {
      const kb = { items: [] }
      const result = safeValidateKnowledgeBase(kb)
      expect(result.success).toBe(false)
    })
  })

  describe('extractUrls', () => {
    it('extracts URLs from KB items', () => {
      const kb: KnowledgeBase = {
        name: 'Test',
        items: [
          { url: 'https://example.com/1', title: 'One' },
          { url: 'https://example.com/2', title: 'Two' },
        ],
      }
      const urls = extractUrls(kb)
      expect(urls).toEqual(['https://example.com/1', 'https://example.com/2'])
    })
  })

  describe('itemTypeToDcType', () => {
    it('maps item types to Dublin Core types', () => {
      expect(itemTypeToDcType('web_page')).toBe('Text')
      expect(itemTypeToDcType('pdf')).toBe('Text')
      expect(itemTypeToDcType('image')).toBe('Image')
      expect(itemTypeToDcType('audio_file')).toBe('Sound')
      expect(itemTypeToDcType('video_file')).toBe('MovingImage')
      expect(itemTypeToDcType('youtube_video')).toBe('MovingImage')
      expect(itemTypeToDcType('dataset')).toBe('Dataset')
      expect(itemTypeToDcType('other')).toBe('PhysicalObject')
    })
  })

  describe('dcTypeToItemType', () => {
    it('maps Dublin Core types to item types', () => {
      expect(dcTypeToItemType('Text')).toBe('web_page')
      expect(dcTypeToItemType('Image')).toBe('image')
      expect(dcTypeToItemType('Sound')).toBe('audio_file')
      expect(dcTypeToItemType('MovingImage')).toBe('video_file')
      expect(dcTypeToItemType('Dataset')).toBe('dataset')
      expect(dcTypeToItemType('PhysicalObject')).toBe('other')
      expect(dcTypeToItemType('UnknownType')).toBe('other') // fallback
    })
  })
})
