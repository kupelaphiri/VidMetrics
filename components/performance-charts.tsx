'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VideoMetrics } from '@/lib/types'

interface PerformanceChartsProps {
  videos: VideoMetrics[]
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
  },
  itemStyle: { color: 'var(--foreground)' },
  labelStyle: { color: 'var(--foreground)' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PerformanceCharts({ videos }: PerformanceChartsProps) {
  const viewsOverTime = useMemo(() => {
    return [...videos]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .slice(-15)
      .map((video, index) => ({
        name: `V${index + 1}`,
        views: video.viewCount,
        title: video.title.slice(0, 30) + (video.title.length > 30 ? '...' : ''),
      }))
  }, [videos])

  const topVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(video => ({
        name: video.title.slice(0, 20) + (video.title.length > 20 ? '...' : ''),
        views: video.viewCount,
        fullTitle: video.title,
      }))
  }, [videos])

  const trendingDistribution = useMemo(() => {
    return [
      { name: 'Trending Up', value: videos.filter(v => v.trending === 'up').length, color: 'var(--chart-2)' },
      { name: 'Stable', value: videos.filter(v => v.trending === 'stable').length, color: 'var(--muted-foreground)' },
      { name: 'Declining', value: videos.filter(v => v.trending === 'down').length, color: 'var(--destructive)' },
    ].filter(item => item.value > 0)
  }, [videos])

  const engagementData = useMemo(() => {
    return [...videos]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .slice(-15)
      .map((video, index) => ({
        name: `V${index + 1}`,
        engagement: video.engagementRate,
        title: video.title.slice(0, 30) + (video.title.length > 30 ? '...' : ''),
      }))
  }, [videos])

  // Best time to post — avg views by day of week
  const bestDayData = useMemo(() => {
    const buckets: { views: number[], count: number }[] = Array.from({ length: 7 }, () => ({ views: [], count: 0 }))
    videos.forEach(v => {
      const day = new Date(v.publishedAt).getDay()
      buckets[day].views.push(v.viewCount)
      buckets[day].count++
    })
    return DAYS.map((day, i) => ({
      day,
      avgViews: buckets[i].count > 0 ? Math.round(buckets[i].views.reduce((a, b) => a + b, 0) / buckets[i].count) : 0,
      count: buckets[i].count,
    }))
  }, [videos])

  // Topic clustering — top keywords in titles by avg views
  const topicData = useMemo(() => {
    const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'it', 'i', 'my', 'you', 'how', 'why', 'what', 'this', 'that', 'are', 'was', 'be', 'do', 'did', 'get', 'got', 'ft', 'vs'])
    const wordMap: Record<string, { totalViews: number, count: number }> = {}

    videos.forEach(v => {
      const words = v.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      words.forEach(word => {
        if (word.length < 3 || STOP_WORDS.has(word)) return
        if (!wordMap[word]) wordMap[word] = { totalViews: 0, count: 0 }
        wordMap[word].totalViews += v.viewCount
        wordMap[word].count++
      })
    })

    return Object.entries(wordMap)
      .filter(([, v]) => v.count >= 2)
      .map(([word, v]) => ({ word, avgViews: Math.round(v.totalViews / v.count), count: v.count }))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 8)
  }, [videos])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Views Over Time */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Views Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsOverTime}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={formatNumber} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), 'Views']} labelFormatter={(l, p) => p[0]?.payload?.title || l} />
                <Area type="monotone" dataKey="views" stroke="var(--chart-1)" strokeWidth={2} fill="url(#viewsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVideos} layout="vertical">
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={formatNumber} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={100} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v), 'Views']} labelFormatter={(l, p) => p[0]?.payload?.fullTitle || l} />
                <Bar dataKey="views" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Performance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trendingDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {trendingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, name: string) => [v + ' videos', name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {trendingDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Rate */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Engagement Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v.toFixed(2) + '%', 'Engagement']} labelFormatter={(l, p) => p[0]?.payload?.title || l} />
                <Bar dataKey="engagement" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Best Day to Post */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Best Day to Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestDayData}>
                <XAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={formatNumber} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: number, _: string, props: { payload?: { count: number } }) => [
                    `${formatNumber(v)} avg views (${props.payload?.count ?? 0} videos)`,
                    'Avg Views',
                  ]}
                />
                <Bar dataKey="avgViews" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {bestDayData.length > 0 && (() => {
            const best = bestDayData.reduce((a, b) => a.avgViews > b.avgViews ? a : b)
            return best.count > 0 ? (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Best day: <span className="text-foreground font-medium">{best.day}</span> — avg {formatNumber(best.avgViews)} views
              </p>
            ) : null
          })()}
        </CardContent>
      </Card>

      {/* Top Title Keywords */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Title Keywords by Avg Views</CardTitle>
        </CardHeader>
        <CardContent>
          {topicData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Not enough data to detect patterns</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical">
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={formatNumber} />
                  <YAxis type="category" dataKey="word" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={80} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v: number, _: string, props: { payload?: { count: number } }) => [
                      `${formatNumber(v)} avg views (${props.payload?.count ?? 0} videos)`,
                      'Avg Views',
                    ]}
                  />
                  <Bar dataKey="avgViews" fill="var(--chart-5)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
