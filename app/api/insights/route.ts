import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI insights not configured — add GROQ_API_KEY to .env.local' }, { status: 500 })
  }

  try {
    const { channel, videos } = await request.json()

    const avgViews = videos.reduce((s: number, v: { viewCount: number }) => s + v.viewCount, 0) / videos.length
    const avgEngagement = videos.reduce((s: number, v: { engagementRate: number }) => s + v.engagementRate, 0) / videos.length

    const sorted = [...videos].sort((a: { publishedAt: string }, b: { publishedAt: string }) =>
      new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    )
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((new Date(sorted[i].publishedAt).getTime() - new Date(sorted[i - 1].publishedAt).getTime()) / 86400000)
    }
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0

    const shorts = videos.filter((v: { duration: string }) => {
      const parts = v.duration.split(':').map(Number)
      const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]
      return secs <= 60
    })
    const shortsAvg = shorts.length
      ? shorts.reduce((s: number, v: { viewCount: number }) => s + v.viewCount, 0) / shorts.length
      : 0
    const regularCount = videos.length - shorts.length
    const regularAvg = regularCount > 0
      ? videos
          .filter((v: { duration: string }) => {
            const parts = v.duration.split(':').map(Number)
            const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]
            return secs > 60
          })
          .reduce((s: number, v: { viewCount: number }) => s + v.viewCount, 0) / regularCount
      : 0

    const prompt = `YouTube analytics expert. Give 5 specific insights for this channel. Be direct, no generic advice.

Channel: ${channel.title} | ${(channel.subscriberCount / 1000).toFixed(0)}K subs | ${videos.length} videos analyzed
Avg views: ${(avgViews / 1000).toFixed(1)}K | Engagement: ${avgEngagement.toFixed(2)}% | Upload gap: ${avgGap.toFixed(1)} days
Shorts: ${shorts.length} avg ${(shortsAvg / 1000).toFixed(1)}K views | Regular: ${regularCount} avg ${(regularAvg / 1000).toFixed(1)}K views

Return exactly 5 bullet points about THIS channel's patterns, strengths, weaknesses, or opportunities. Start each with an emoji.`

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
    })
    const text = completion.choices[0]?.message?.content || ''

    const bullets = text
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(l => l.length > 10)
      .slice(0, 5)

    return NextResponse.json({ bullets })
  } catch (error: unknown) {
    console.error('Insights error:', error)
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) {
      return NextResponse.json({ error: 'rate_limited', retryAfter: 20 }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
