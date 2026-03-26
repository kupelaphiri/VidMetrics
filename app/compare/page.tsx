'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, AlertCircle, TrendingUp, Users, Eye, PlayCircle, Zap } from 'lucide-react'
import Image from 'next/image'
import type { AnalyticsData } from '@/lib/types'

function formatNumber(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

interface ChannelSlotProps {
  label: string
  data: AnalyticsData | null
  isLoading: boolean
  error: string | null
  url: string
  onUrlChange: (v: string) => void
  onAnalyze: () => void
}

function ChannelSlot({ label, data, isLoading, error, url, onUrlChange, onAnalyze }: ChannelSlotProps) {
  const [imgError, setImgError] = useState(false)
  const handleImgError = useCallback(() => setImgError(true), [])

  return (
    <div className="flex-1 min-w-0 space-y-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <form onSubmit={e => { e.preventDefault(); onAnalyze() }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="youtube.com/@channel"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Button type="submit" disabled={isLoading || !url.trim()} size="sm">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary/10 shrink-0">
                {data.channel.thumbnail && !imgError ? (
                  <Image src={data.channel.thumbnail} alt={data.channel.title} fill className="object-cover" onError={handleImgError} />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-primary font-bold">
                    {data.channel.title.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{data.channel.title}</p>
                <p className="text-xs text-muted-foreground">{formatNumber(data.channel.subscriberCount)} subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatRowProps {
  icon: React.ElementType
  label: string
  a: string | null
  b: string | null
  aRaw?: number
  bRaw?: number
}

function StatRow({ icon: Icon, label, a, b, aRaw, bRaw }: StatRowProps) {
  const aWins = aRaw !== undefined && bRaw !== undefined && aRaw > bRaw
  const bWins = aRaw !== undefined && bRaw !== undefined && bRaw > aRaw

  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border last:border-0">
      <div className={`text-sm font-medium text-right pr-4 ${aWins ? 'text-chart-2' : 'text-foreground'}`}>{a ?? '—'}</div>
      <div className="flex flex-col items-center gap-1">
        <div className="p-1.5 rounded-lg bg-muted">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground text-center">{label}</span>
      </div>
      <div className={`text-sm font-medium text-left pl-4 ${bWins ? 'text-chart-2' : 'text-foreground'}`}>{b ?? '—'}</div>
    </div>
  )
}

export default function ComparePage() {
  const [urlA, setUrlA] = useState('')
  const [urlB, setUrlB] = useState('')
  const [dataA, setDataA] = useState<AnalyticsData | null>(null)
  const [dataB, setDataB] = useState<AnalyticsData | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [errorA, setErrorA] = useState<string | null>(null)
  const [errorB, setErrorB] = useState<string | null>(null)

  const getApiKey = () => localStorage.getItem('youtube_api_key') || ''

  const analyze = async (url: string, setData: (d: AnalyticsData) => void, setLoading: (v: boolean) => void, setError: (e: string | null) => void) => {
    setLoading(true)
    setError(null)
    try {
      const apiKey = getApiKey()
      const res = await fetch(`/api/youtube?channel=${encodeURIComponent(url)}&maxResults=50`, {
        headers: { ...(apiKey && { 'X-Api-Key': apiKey }) },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch channel')
    } finally {
      setLoading(false)
    }
  }

  const avgUploadGap = (data: AnalyticsData) => {
    const sorted = [...data.videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    const gaps = sorted.slice(1).map((v, i) => (new Date(v.publishedAt).getTime() - new Date(sorted[i].publishedAt).getTime()) / 86400000)
    return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  }

  const showComparison = dataA && dataB

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Channel Comparison</h1>
          <p className="text-muted-foreground mt-1">Compare two YouTube channels side by side</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <ChannelSlot
            label="Channel A"
            data={dataA}
            isLoading={loadingA}
            error={errorA}
            url={urlA}
            onUrlChange={setUrlA}
            onAnalyze={() => analyze(urlA, setDataA, setLoadingA, setErrorA)}
          />
          <div className="hidden sm:flex items-center justify-center">
            <div className="w-px h-full bg-border" />
          </div>
          <ChannelSlot
            label="Channel B"
            data={dataB}
            isLoading={loadingB}
            error={errorB}
            url={urlB}
            onUrlChange={setUrlB}
            onAnalyze={() => analyze(urlB, setDataB, setLoadingB, setErrorB)}
          />
        </div>

        {showComparison && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Head to Head</CardTitle>
              <div className="grid grid-cols-3 pt-1">
                <p className="text-sm font-semibold text-foreground text-right pr-4 truncate">{dataA.channel.title}</p>
                <div />
                <p className="text-sm font-semibold text-foreground text-left pl-4 truncate">{dataB.channel.title}</p>
              </div>
            </CardHeader>
            <CardContent>
              <StatRow icon={Users} label="Subscribers"
                a={formatNumber(dataA.channel.subscriberCount)} aRaw={dataA.channel.subscriberCount}
                b={formatNumber(dataB.channel.subscriberCount)} bRaw={dataB.channel.subscriberCount} />
              <StatRow icon={Eye} label="Total Views"
                a={formatNumber(dataA.channel.viewCount)} aRaw={dataA.channel.viewCount}
                b={formatNumber(dataB.channel.viewCount)} bRaw={dataB.channel.viewCount} />
              <StatRow icon={PlayCircle} label="Avg Views / Video"
                a={formatNumber(Math.round(dataA.avgViews))} aRaw={dataA.avgViews}
                b={formatNumber(Math.round(dataB.avgViews))} bRaw={dataB.avgViews} />
              <StatRow icon={TrendingUp} label="Avg Engagement"
                a={dataA.avgEngagement.toFixed(2) + '%'} aRaw={dataA.avgEngagement}
                b={dataB.avgEngagement.toFixed(2) + '%'} bRaw={dataB.avgEngagement} />
              <StatRow icon={Zap} label="Upload Frequency"
                a={`Every ${avgUploadGap(dataA).toFixed(0)}d`} aRaw={1 / (avgUploadGap(dataA) || 1)}
                b={`Every ${avgUploadGap(dataB).toFixed(0)}d`} bRaw={1 / (avgUploadGap(dataB) || 1)} />
              <StatRow icon={PlayCircle} label="Videos Analyzed"
                a={dataA.videos.length.toString()} aRaw={dataA.videos.length}
                b={dataB.videos.length.toString()} bRaw={dataB.videos.length} />
            </CardContent>
          </Card>
        )}

        {!showComparison && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Load both channels above to see the comparison</p>
          </div>
        )}
      </main>
    </div>
  )
}
