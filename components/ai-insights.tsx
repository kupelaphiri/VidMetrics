'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsData } from '@/lib/types'

interface AIInsightsProps {
  data: AnalyticsData
}

export function AIInsights({ data }: AIInsightsProps) {
  const [bullets, setBullets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [retryIn, setRetryIn] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startCountdown = (seconds: number) => {
    setRetryIn(seconds)
    timerRef.current = setInterval(() => {
      setRetryIn(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const generate = async () => {
    setIsLoading(true)
    setError(null)
    setOpen(true)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: data.channel, videos: data.videos }),
      })
      const json = await res.json()
      if (res.status === 429) {
        startCountdown(json.retryAfter || 20)
        setError('rate_limited')
        return
      }
      if (!res.ok) throw new Error(json.error || 'Failed to generate')
      setBullets(json.bullets)
      setGenerated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate insights')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">AI Insights</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!generated ? (
              <Button size="sm" onClick={generate} disabled={isLoading || retryIn > 0}>
                {isLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Generate</>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={generate} disabled={isLoading || retryIn > 0}>
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Regenerate'}
                </Button>
                <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          {error && error === 'rate_limited' ? (
            <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {retryIn > 0
                ? `Free tier rate limit hit — retry in ${retryIn}s`
                : 'Ready to retry — click Generate again'}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : null}
          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Claude is analyzing {data.channel.title}...
            </div>
          )}
          {!isLoading && bullets.length > 0 && (
            <ul className="space-y-3">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {i + 1}
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  )
}
