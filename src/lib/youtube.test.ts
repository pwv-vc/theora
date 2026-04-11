import { describe, expect, it } from 'vitest'
import {
  isYouTubeUrl,
  mapYouTubeFailureMessage,
  normalizeYouTubeInput,
  parseYouTubeTranscriptMarkdown,
  parseVttTranscript,
  renderYouTubeTranscriptMarkdown,
  sanitizeExistingYouTubeTranscriptMarkdown,
  suggestYouTubeTranscriptFilename,
} from './youtube.js'

describe('isYouTubeUrl', () => {
  it('accepts supported YouTube host variants', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(true)
    expect(isYouTubeUrl('https://youtube.com/watch?v=abc123')).toBe(true)
    expect(isYouTubeUrl('https://m.youtube.com/watch?v=abc123')).toBe(true)
    expect(isYouTubeUrl('https://youtu.be/abc123')).toBe(true)
    expect(isYouTubeUrl('https://www.youtube.com/shorts/abc123')).toBe(true)
  })

  it('rejects non-video or non-YouTube URLs', () => {
    expect(isYouTubeUrl('https://www.youtube.com/playlist?list=PL123')).toBe(false)
    expect(isYouTubeUrl('https://example.com/watch?v=abc123')).toBe(false)
    expect(isYouTubeUrl('not a url')).toBe(false)
  })
})

describe('normalizeYouTubeInput', () => {
  it('accepts bare video ids and yt prefixes without requiring shell-sensitive urls', () => {
    expect(normalizeYouTubeInput('1cF_Afc5_tA')).toBe('https://www.youtube.com/watch?v=1cF_Afc5_tA')
    expect(normalizeYouTubeInput('yt:1cF_Afc5_tA')).toBe('https://www.youtube.com/watch?v=1cF_Afc5_tA')
  })

  it('passes through supported youtube urls', () => {
    expect(normalizeYouTubeInput('https://youtu.be/1cF_Afc5_tA')).toBe('https://youtu.be/1cF_Afc5_tA')
  })
})

describe('suggestYouTubeTranscriptFilename', () => {
  it('includes the video id and a slugged title', () => {
    expect(suggestYouTubeTranscriptFilename('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up'))
      .toBe('youtube-dQw4w9WgXcQ-rick-astley-never-gonna-give-you-up.md')
  })
})

describe('parseVttTranscript', () => {
  it('removes timing metadata and deduplicates repeated caption lines', () => {
    const transcript = parseVttTranscript(`WEBVTT

Kind: captions
Language: en

00:00:00.000 --> 00:00:01.000
<c>Hello</c>

00:00:01.000 --> 00:00:02.000
Hello

2
00:00:02.000 --> 00:00:03.000 align:start position:0%
World
`)

    expect(transcript).toBe('Hello World')
  })
})

describe('renderYouTubeTranscriptMarkdown', () => {
  it('includes source metadata and transcript text', () => {
    const markdown = renderYouTubeTranscriptMarkdown({
      title: 'A Test Video',
      channel: 'Theora Lab',
      videoId: 'abc123',
      channelId: 'channel-789',
      url: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
      publishedDate: '2026-04-11',
      description: 'The original video description.',
      durationSeconds: 125,
      transcript: 'First line. Second line.',
    })

    expect(markdown).toContain('# A Test Video')
    expect(markdown).toContain('**Channel:** Theora Lab')
    expect(markdown).toContain('**Video ID:** abc123')
    expect(markdown).toContain('**Channel ID:** channel-789')
    expect(markdown).toContain('**URL:** https://www.youtube.com/watch?v=abc123')
    expect(markdown).toContain('**Thumbnail URL:** https://i.ytimg.com/vi/abc123/maxresdefault.jpg')
    expect(markdown).toContain('**Published:** 2026-04-11')
    expect(markdown).toContain('**Duration:** 2:05')
    expect(markdown).toContain('## Description')
    expect(markdown).toContain('The original video description.')
    expect(markdown).toContain('## Transcript')
    expect(markdown).toContain('First line. Second line.')
  })
})

describe('parseYouTubeTranscriptMarkdown', () => {
  it('extracts exact transcript metadata for compile-time reuse', () => {
    const parsed = parseYouTubeTranscriptMarkdown(`# A Test Video

**Channel:** Theora Lab  
**Video ID:** abc123  
**Channel ID:** channel-789  
**URL:** https://www.youtube.com/watch?v=abc123  
**Thumbnail URL:** https://i.ytimg.com/vi/abc123/maxresdefault.jpg  
**Published:** 2026-04-11  
**Duration:** 2:05  
**Source:** YouTube captions

## Description

The original video description.

## Transcript

Hello world
`)

    expect(parsed).toEqual({
      title: 'A Test Video',
      channel: 'Theora Lab',
      videoId: 'abc123',
      channelId: 'channel-789',
      url: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
      publishedDate: '2026-04-11',
      duration: '2:05',
      description: 'The original video description.',
      transcript: 'Hello world',
    })
  })
})

describe('sanitizeExistingYouTubeTranscriptMarkdown', () => {
  it('caps and sanitizes description, captions, and thumbnail url', () => {
    const markdown = sanitizeExistingYouTubeTranscriptMarkdown(`# A Test Video

**Channel:** Theora Lab  
**Video ID:** abc123  
**Channel ID:** channel-789  
**URL:** https://www.youtube.com/watch?v=abc123  
**Thumbnail URL:** https://evil.example/track.png  
**Published:** 2026-04-11  
**Duration:** 2:05  
**Source:** YouTube captions

## Description

Hello <script>alert(1)</script> world $$$ 123 !!!

## Transcript

Hello 123 world <script>bad</script>!!!
`)

    expect(markdown).toContain('**Thumbnail URL:** Unknown')
    expect(markdown).toContain('## Description')
    expect(markdown).toContain('Hello script alert(1) /script world $$$ 123 !!!')
    expect(markdown).toContain('## Transcript')
    expect(markdown).toContain('Hello world script bad /script!!!')
    expect(markdown).not.toContain('123 world <script>')
  })
})

describe('mapYouTubeFailureMessage', () => {
  it('turns yt-dlp stderr into clearer product errors', () => {
    expect(mapYouTubeFailureMessage('ERROR: Private video')).toBe(
      'This YouTube video is private and cannot be ingested',
    )
    expect(mapYouTubeFailureMessage('ERROR: Sign in to confirm your age')).toBe(
      'This YouTube video is age-restricted and captions cannot be fetched',
    )
    expect(mapYouTubeFailureMessage('ERROR: Video unavailable')).toBe(
      'This YouTube video is unavailable or has been removed',
    )
  })
})
