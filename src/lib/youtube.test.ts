import { describe, expect, it } from 'vitest'
import {
  isYouTubeUrl,
  mapYouTubeFailureMessage,
  parseVttTranscript,
  renderYouTubeTranscriptMarkdown,
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
      url: 'https://www.youtube.com/watch?v=abc123',
      durationSeconds: 125,
      transcript: 'First line. Second line.',
    })

    expect(markdown).toContain('# A Test Video')
    expect(markdown).toContain('**Channel:** Theora Lab')
    expect(markdown).toContain('**URL:** https://www.youtube.com/watch?v=abc123')
    expect(markdown).toContain('**Duration:** 2:05')
    expect(markdown).toContain('## Transcript')
    expect(markdown).toContain('First line. Second line.')
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
