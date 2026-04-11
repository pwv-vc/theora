import { describe, expect, it } from 'vitest'
import { computeFrameSchedule, formatTimecode } from './media-ffmpeg.js'

describe('computeFrameSchedule', () => {
  it('scales with duration (12/min, 30s -> 6 frames)', () => {
    const times = computeFrameSchedule(30, {
      videoFramesPerMinute: 12,
      videoMinFrames: 2,
      videoMaxFrames: 24,
    })
    expect(times).toHaveLength(6)
  })

  it('caps at videoMaxFrames for long media', () => {
    const times = computeFrameSchedule(3600, {
      videoFramesPerMinute: 12,
      videoMinFrames: 2,
      videoMaxFrames: 24,
    })
    expect(times).toHaveLength(24)
  })

  it('uses min frames when duration unknown', () => {
    const times = computeFrameSchedule(null, {
      videoFramesPerMinute: 12,
      videoMinFrames: 2,
      videoMaxFrames: 24,
    })
    expect(times.length).toBeGreaterThanOrEqual(1)
  })
})

describe('formatTimecode', () => {
  it('formats mm:ss under one hour', () => {
    expect(formatTimecode(65)).toBe('1:05')
  })

  it('formats h:mm:ss when needed', () => {
    expect(formatTimecode(3665)).toBe('1:01:05')
  })
})
