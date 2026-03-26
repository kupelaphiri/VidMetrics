'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AnalyticsData } from '@/lib/types'

interface ExportButtonProps {
  data: AnalyticsData
}

export function ExportButton({ data }: ExportButtonProps) {
  const exportCSV = () => {
    const headers = ['Title', 'Views', 'Likes', 'Comments', 'Engagement Rate', 'Published Date', 'Duration', 'Trend']
    const rows = data.videos.map(video => [
      `"${video.title.replace(/"/g, '""')}"`,
      video.viewCount,
      video.likeCount,
      video.commentCount,
      video.engagementRate.toFixed(2) + '%',
      new Date(video.publishedAt).toLocaleDateString(),
      video.duration,
      video.trending,
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${data.channel.title.replace(/[^a-z0-9]/gi, '_')}_videos.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportJSON = () => {
    const exportData = {
      channel: {
        name: data.channel.title,
        subscribers: data.channel.subscriberCount,
        totalViews: data.channel.viewCount,
        videoCount: data.channel.videoCount,
      },
      summary: {
        totalViews: data.totalViews,
        avgViews: data.avgViews,
        avgEngagement: data.avgEngagement,
      },
      videos: data.videos.map(video => ({
        title: video.title,
        views: video.viewCount,
        likes: video.likeCount,
        comments: video.commentCount,
        engagementRate: video.engagementRate,
        publishedAt: video.publishedAt,
        duration: video.duration,
        trending: video.trending,
        url: `https://youtube.com/watch?v=${video.id}`,
      })),
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${data.channel.title.replace(/[^a-z0-9]/gi, '_')}_analytics.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
