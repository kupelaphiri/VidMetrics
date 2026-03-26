'use client'

import { Users, Eye, PlayCircle, TrendingUp, DollarSign, Zap, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { AnalyticsData } from '@/lib/types'

interface StatsCardsProps {
  data: AnalyticsData
}

function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getUploadConsistency(videos: AnalyticsData['videos']): { label: string, rating: string, color: string } {
  if (videos.length < 2) return { label: 'N/A', rating: '', color: 'text-muted-foreground' }
  const sorted = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
  const gaps = sorted.slice(1).map((v, i) =>
    (new Date(v.publishedAt).getTime() - new Date(sorted[i].publishedAt).getTime()) / 86400000
  )
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  if (avg <= 7) return { label: `Every ${avg.toFixed(0)}d`, rating: 'Consistent', color: 'text-chart-2' }
  if (avg <= 14) return { label: `Every ${avg.toFixed(0)}d`, rating: 'Regular', color: 'text-chart-3' }
  return { label: `Every ${avg.toFixed(0)}d`, rating: 'Irregular', color: 'text-destructive' }
}

function getViralVelocity(videos: AnalyticsData['videos']): string {
  if (videos.length === 0) return '0'
  const scored = videos.map(v => {
    const age = Math.max(1, (Date.now() - new Date(v.publishedAt).getTime()) / 86400000)
    return v.viewCount / age
  })
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length
  return formatNumber(Math.round(avg)) + '/day'
}

function getRevenueEstimate(totalViews: number): string {
  // Industry avg CPM $1–$5, YouTube takes 45%
  const low = Math.round((totalViews / 1000) * 1 * 0.55)
  const high = Math.round((totalViews / 1000) * 5 * 0.55)
  return `$${formatNumber(low)} – $${formatNumber(high)}`
}

export function StatsCards({ data }: StatsCardsProps) {
  const consistency = getUploadConsistency(data.videos)
  const velocity = getViralVelocity(data.videos)
  const revenue = getRevenueEstimate(data.channel.viewCount)

  const stats = [
    {
      label: 'Subscribers',
      value: formatNumber(data.channel.subscriberCount),
      icon: Users,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
      sub: null,
    },
    {
      label: 'Total Views',
      value: formatNumber(data.channel.viewCount),
      icon: Eye,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
      sub: null,
    },
    {
      label: 'Avg Engagement',
      value: data.avgEngagement.toFixed(2) + '%',
      icon: TrendingUp,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      sub: null,
    },
    {
      label: 'Est. Lifetime Revenue',
      value: revenue,
      icon: DollarSign,
      color: 'text-chart-5',
      bgColor: 'bg-chart-5/10',
      sub: 'Based on $1–$5 CPM',
    },
    {
      label: 'Viral Velocity',
      value: velocity,
      icon: Zap,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      sub: 'Avg views per day',
    },
    {
      label: 'Upload Frequency',
      value: consistency.label,
      icon: Calendar,
      color: consistency.color,
      bgColor: 'bg-primary/10',
      sub: consistency.rating,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-foreground truncate">{stat.value}</p>
                {stat.sub && <p className={`text-xs mt-0.5 ${stat.color}`}>{stat.sub}</p>}
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
