/** @jsxImportSource hono/jsx */

import { TextIcon } from './text.js'
import { DataIcon } from './data.js'
import { PdfIcon } from './pdf.js'
import { ImageIcon } from './image.js'
import { AudioIcon } from './audio.js'
import { VideoIcon } from './video.js'
import { YouTubeIcon } from './youtube.js'

interface SourceTypeIconProps {
  type: 'text' | 'data' | 'pdf' | 'image' | 'audio' | 'video' | 'youtube'
  size?: number
}

export function SourceTypeIcon({ type, size = 14 }: SourceTypeIconProps) {
  const iconMap = {
    text: TextIcon,
    data: DataIcon,
    pdf: PdfIcon,
    image: ImageIcon,
    audio: AudioIcon,
    video: VideoIcon,
    youtube: YouTubeIcon,
  }

  const Icon = iconMap[type]
  if (!Icon) return null

  return <Icon size={size} />
}
