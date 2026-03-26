'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { ChannelHeader } from '@/components/channel-header'
import { StatsCards } from '@/components/stats-cards'
import { VideoTable } from '@/components/video-table'
import { PerformanceCharts } from '@/components/performance-charts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Table, Loader2, AlertCircle } from 'lucide-react'
import type { AnalyticsData } from '@/lib/types'

export default function SharedReportPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/share?id=${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        const { created_at, ...report } = json
        setData(report)
        setCreatedAt(created_at)
      })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-foreground font-medium">Report not found</p>
          <p className="text-muted-foreground text-sm">This link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Read-only shared report
            </span>
            {createdAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Generated {new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ChannelHeader channel={data.channel} onReset={() => {}} />
          <StatsCards data={data} />
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="videos" className="gap-2">
                <Table className="w-4 h-4" /> Videos
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2">
                <BarChart3 className="w-4 h-4" /> Charts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="videos">
              <VideoTable videos={data.videos} />
            </TabsContent>
            <TabsContent value="charts">
              <PerformanceCharts videos={data.videos} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
