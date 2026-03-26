'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { ChannelInput } from '@/components/channel-input'
import { ChannelHeader } from '@/components/channel-header'
import { StatsCards } from '@/components/stats-cards'
import { VideoTable } from '@/components/video-table'
import { PerformanceCharts } from '@/components/performance-charts'
import { ExportButton } from '@/components/export-button'
import { AIInsights } from '@/components/ai-insights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AlertCircle, BarChart3, Table, Share2, Check, Loader2 } from 'lucide-react'
import type { AnalyticsData } from '@/lib/types'

function getSettings() {
  try {
    const raw = localStorage.getItem('vidmetrics_settings')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function autoExport(data: AnalyticsData, format: string) {
  if (format === 'json') {
    const exportData = {
      channel: { name: data.channel.title, subscribers: data.channel.subscriberCount },
      videos: data.videos.map(v => ({
        title: v.title, views: v.viewCount, likes: v.likeCount,
        comments: v.commentCount, engagementRate: v.engagementRate,
        publishedAt: v.publishedAt, duration: v.duration, trending: v.trending,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${data.channel.title.replace(/[^a-z0-9]/gi, '_')}_analytics.json`
    link.click()
    URL.revokeObjectURL(link.href)
  } else {
    const headers = ['Title', 'Views', 'Likes', 'Comments', 'Engagement Rate', 'Published Date', 'Duration', 'Trend']
    const rows = data.videos.map(v => [
      `"${v.title.replace(/"/g, '""')}"`,
      v.viewCount, v.likeCount, v.commentCount,
      v.engagementRate.toFixed(2) + '%',
      new Date(v.publishedAt).toLocaleDateString(),
      v.duration, v.trending,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${data.channel.title.replace(/[^a-z0-9]/gi, '_')}_videos.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
}

export default function Home() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyWarning, setApiKeyWarning] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const handleShare = async () => {
    if (!analyticsData) return
    setShareLoading(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData),
      })
      const { id } = await res.json()
      const url = `${window.location.origin}/share/${id}`
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 3000)
    } catch {
      // silent fail
    } finally {
      setShareLoading(false)
    }
  }

  useEffect(() => {
    // Request notification permission if enabled in settings
    const settings = getSettings()
    if (settings?.notifications_enabled && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const getApiKey = () => localStorage.getItem('youtube_api_key') || ''

  const saveToHistory = async (data: AnalyticsData) => {
    try {
      const avgViews = data.videos.length > 0
        ? Math.round(data.videos.reduce((sum, v) => sum + v.viewCount, 0) / data.videos.length)
        : 0
      const avgEngagement = data.videos.length > 0
        ? data.videos.reduce((sum, v) => sum + v.engagementRate, 0) / data.videos.length
        : 0

      const apiKey = getApiKey()
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-Api-Key': apiKey }),
        },
        body: JSON.stringify({
          channelId: data.channel.id,
          channelName: data.channel.title,
          channelThumbnail: data.channel.thumbnail,
          subscriberCount: data.channel.subscriberCount,
          totalViews: data.channel.viewCount,
          videoCount: data.channel.videoCount,
          videosAnalyzed: data.videos.length,
          avgViews,
          avgEngagement: avgEngagement.toFixed(2),
          videosData: data.videos,
        }),
      })
    } catch (err) {
      console.error('Failed to save to history:', err)
    }
  }

  const handleAnalyze = async (channelUrl: string) => {
    setIsLoading(true)
    setError(null)
    setApiKeyWarning(null)

    try {
      const apiKey = getApiKey()
      const settings = getSettings()
      const maxResults = settings?.videos_to_fetch || 50
      const response = await fetch(`/api/youtube?channel=${encodeURIComponent(channelUrl)}&maxResults=${maxResults}`, {
        headers: { ...(apiKey && { 'X-Api-Key': apiKey }) },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch channel data')
      }

      if (data.apiKeyWarning) setApiKeyWarning(data.apiKeyWarning)

      setAnalyticsData(data)
      if (!data.apiKeyWarning) saveToHistory(data)

      if (settings?.auto_export) {
        autoExport(data, settings.export_format || 'csv')
      }

      if (settings?.notifications_enabled && Notification.permission === 'granted') {
        new Notification('Analysis complete', {
          body: `${data.channel.title} — ${data.videos.length} videos analyzed`,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setAnalyticsData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setAnalyticsData(null)
    setError(null)
    setApiKeyWarning(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!analyticsData ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <ChannelInput onAnalyze={handleAnalyze} isLoading={isLoading} />

            {error && (
              <div className="mt-6 flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="mt-16 text-center">
              <h3 className="text-lg font-medium text-foreground mb-4">How it works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">Paste Channel URL</h4>
                  <p className="text-sm text-muted-foreground">Enter any YouTube channel URL or handle</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">Analyze Performance</h4>
                  <p className="text-sm text-muted-foreground">Get detailed metrics on their latest videos</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">Export Insights</h4>
                  <p className="text-sm text-muted-foreground">Download data in CSV or JSON format</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <ChannelHeader channel={analyticsData.channel} onReset={handleReset} />
            </div>

            {apiKeyWarning && (
              <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 px-4 py-3 rounded-lg border border-amber-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {apiKeyWarning}
              </div>
            )}

            <StatsCards data={analyticsData} />

            <AIInsights data={analyticsData} />

            <Tabs defaultValue="videos" className="w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="videos" className="gap-2">
                    <Table className="w-4 h-4" />
                    Videos
                  </TabsTrigger>
                  <TabsTrigger value="charts" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Charts
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare} disabled={shareLoading}>
                    {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {shareCopied ? 'Copied!' : 'Share'}
                  </Button>
                  <ExportButton data={analyticsData} />
                </div>
              </div>

              <TabsContent value="videos">
                <VideoTable videos={analyticsData.videos} />
              </TabsContent>

              <TabsContent value="charts">
                <PerformanceCharts videos={analyticsData.videos} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              VidMetrics - YouTube Competitor Analysis Tool
            </p>
            <p className="text-xs text-muted-foreground">
              Data provided by YouTube Data API
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
