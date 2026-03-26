'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChannelInfo } from '@/lib/types'

interface ChannelHeaderProps {
  channel: ChannelInfo
  onReset: () => void
}

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function ChannelHeader({ channel, onReset }: ChannelHeaderProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
          {!imgError && channel.thumbnail ? (
            <Image
              src={channel.thumbnail}
              alt={channel.title}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-primary font-bold text-2xl">
              {channel.title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{channel.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatNumber(channel.subscriberCount)} subscribers • {formatNumber(channel.videoCount)} videos
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-1 sm:flex-initial"
        >
          <a
            href={`https://youtube.com/channel/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4" />
            View Channel
          </a>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onReset}
          className="flex-1 sm:flex-initial"
        >
          Analyze Another
        </Button>
      </div>
    </div>
  )
}
