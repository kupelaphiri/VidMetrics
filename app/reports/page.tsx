'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Calendar, TrendingUp, Trash2, Eye, Loader2, AlertCircle, Info } from 'lucide-react'
import Image from 'next/image'

interface SearchHistory {
  id: string
  channel_id: string
  channel_name: string
  channel_thumbnail: string | null
  subscriber_count: number
  total_views: number
  video_count: number
  videos_analyzed: number
  avg_views: number
  avg_engagement: number
  searched_at: string
  videos_data: unknown[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<SearchHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [brokenImgs, setBrokenImgs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const key = localStorage.getItem('youtube_api_key') || ''
    setHasApiKey(!!key)
    if (key) {
      fetchReports()
    } else {
      setIsLoading(false)
    }
  }, [])

  const getApiKey = () => localStorage.getItem('youtube_api_key') || ''

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const apiKey = getApiKey()
      const response = await fetch('/api/history', {
        headers: { ...(apiKey && { 'X-Api-Key': apiKey }) },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }
      const data = await response.json()
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteReport = async (id: string) => {
    try {
      setDeletingId(id)
      const apiKey = getApiKey()
      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
        headers: { ...(apiKey && { 'X-Api-Key': apiKey }) },
      })
      if (!response.ok) {
        throw new Error('Failed to delete report')
      }
      setReports(reports.filter(r => r.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const exportReport = (report: SearchHistory, format: 'csv' | 'json') => {
    const videos = report.videos_data as Array<{
      title: string
      viewCount: number
      likeCount: number
      commentCount: number
      publishedAt: string
      engagementRate: number
    }>

    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ channel: report, videos }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.channel_name.replace(/\s+/g, '_')}_report.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ['Title', 'Views', 'Likes', 'Comments', 'Published', 'Engagement Rate']
      const rows = videos.map(v => [
        `"${v.title?.replace(/"/g, '""') || ''}"`,
        v.viewCount || 0,
        v.likeCount || 0,
        v.commentCount || 0,
        v.publishedAt || '',
        `${(v.engagementRate || 0).toFixed(2)}%`,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.channel_name.replace(/\s+/g, '_')}_report.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const totalVideosAnalyzed = reports.reduce((acc, r) => acc + (r.videos_analyzed || 0), 0)
  const latestReport = reports[0]?.searched_at ? formatDate(reports[0].searched_at) : 'N/A'

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your channel analysis history
          </p>
        </div>

        {!hasApiKey && (
          <div className="flex items-start gap-3 bg-muted border border-border rounded-lg px-4 py-3 mb-6">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Search history is only tracked when you use your own YouTube API key.{' '}
              <a href="/settings" className="text-primary hover:underline">Add your API key in Settings</a>{' '}
              to start saving your searches.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reports
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{reports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Videos Analyzed
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalVideosAnalyzed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Report
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {latestReport}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search History</CardTitle>
            <CardDescription>
              Your previously analyzed YouTube channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Failed to load reports</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchReports}>Try Again</Button>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Analyze a channel from the dashboard to create your first report
                </p>
                <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30"
                  >
                    <div className="flex items-center gap-4">
                      {report.channel_thumbnail && !brokenImgs.has(report.id) ? (
                        <Image
                          src={report.channel_thumbnail}
                          alt={report.channel_name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          onError={() => setBrokenImgs(prev => new Set(prev).add(report.id))}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                          <span className="text-primary font-semibold text-sm">
                            {report.channel_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-foreground">{report.channel_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.videos_analyzed} videos analyzed - {formatDate(report.searched_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(report.subscriber_count)} subscribers - Avg {formatNumber(report.avg_views)} views
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportReport(report, 'csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportReport(report, 'json')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteReport(report.id)}
                        disabled={deletingId === report.id}
                      >
                        {deletingId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
