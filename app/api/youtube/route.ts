import { NextRequest, NextResponse } from 'next/server'
import type { ChannelInfo, VideoMetrics, AnalyticsData } from '@/lib/types'

const DEFAULT_YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

function extractChannelId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  // If just a channel ID or handle is provided
  if (/^[a-zA-Z0-9_-]+$/.test(url)) return url
  if (url.startsWith('@')) return url.slice(1)
  
  return null
}

function parseDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return '0:00'
  
  const hours = match[1] ? parseInt(match[1]) : 0
  const minutes = match[2] ? parseInt(match[2]) : 0
  const seconds = match[3] ? parseInt(match[3]) : 0
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function calculateEngagementRate(views: number, likes: number, comments: number): number {
  if (views === 0) return 0
  return ((likes + comments) / views) * 100
}

function determineTrending(viewCount: number, avgViews: number): 'up' | 'down' | 'stable' {
  const ratio = viewCount / avgViews
  if (ratio > 1.2) return 'up'
  if (ratio < 0.8) return 'down'
  return 'stable'
}

function checkYouTubeError(data: { error?: { code: number; errors?: { reason: string }[] } }) {
  if (!data.error) return
  const reason = data.error.errors?.[0]?.reason || ''
  const authReasons = ['keyInvalid', 'keyExpired', 'accessNotConfigured', 'forbidden', 'disabled']
  if (authReasons.includes(reason) || data.error.code === 403 || data.error.code === 400) {
    const err = new Error('invalid_api_key')
    ;(err as Error & { isApiKeyError: boolean }).isApiKeyError = true
    throw err
  }
}

async function getChannelByHandle(handle: string, apiKey: string): Promise<string | null> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`
  )
  const data = await response.json()
  checkYouTubeError(data)
  return data.items?.[0]?.id || null
}

async function getChannelInfo(channelId: string, apiKey: string): Promise<ChannelInfo | null> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
  )
  const data = await response.json()
  checkYouTubeError(data)

  if (!data.items || data.items.length === 0) return null

  const channel = data.items[0]
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
    subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
    videoCount: parseInt(channel.statistics.videoCount) || 0,
    viewCount: parseInt(channel.statistics.viewCount) || 0,
    customUrl: channel.snippet.customUrl || '',
  }
}

async function getChannelVideos(channelId: string, apiKey: string, maxResults: number = 50): Promise<VideoMetrics[]> {
  // First get the uploads playlist
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
  )
  const channelData = await channelResponse.json()

  if (!channelData.items || channelData.items.length === 0) return []

  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

  // Paginate playlist items — YouTube caps each page at 50
  const PAGE_SIZE = 50
  const allPlaylistItems: { contentDetails: { videoId: string } }[] = []
  let pageToken: string | undefined = undefined

  while (allPlaylistItems.length < maxResults) {
    const remaining = maxResults - allPlaylistItems.length
    const pageSize = Math.min(remaining, PAGE_SIZE)
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'contentDetails')
    url.searchParams.set('playlistId', uploadsPlaylistId)
    url.searchParams.set('maxResults', String(pageSize))
    url.searchParams.set('key', apiKey)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const pageResponse = await fetch(url.toString())
    const pageData = await pageResponse.json()

    if (!pageData.items || pageData.items.length === 0) break
    allPlaylistItems.push(...pageData.items)

    if (!pageData.nextPageToken) break
    pageToken = pageData.nextPageToken
  }

  if (allPlaylistItems.length === 0) return []

  // Fetch video details in batches of 50 (API limit for videos.list)
  const allVideoIds = allPlaylistItems.map((item) => item.contentDetails.videoId)
  const videoDetails: ReturnType<typeof parseVideoItem>[] = []

  for (let i = 0; i < allVideoIds.length; i += PAGE_SIZE) {
    const batch = allVideoIds.slice(i, i + PAGE_SIZE).join(',')
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}&key=${apiKey}`
    )
    const videosData = await videosResponse.json()
    if (videosData.items) videoDetails.push(...videosData.items.map(parseVideoItem))
  }

  // Calculate average views and update trending status
  const avgViews = videoDetails.reduce((sum, v) => sum + v.viewCount, 0) / videoDetails.length

  return videoDetails.map(video => ({
    ...video,
    trending: determineTrending(video.viewCount, avgViews),
  }))
}

function parseVideoItem(video: {
  id: string
  snippet: {
    title: string
    thumbnails: { high?: { url: string }, medium?: { url: string }, default?: { url: string } }
    publishedAt: string
  }
  statistics: { viewCount?: string, likeCount?: string, commentCount?: string }
  contentDetails: { duration: string }
}) {
  const viewCount = parseInt(video.statistics.viewCount || '0')
  const likeCount = parseInt(video.statistics.likeCount || '0')
  const commentCount = parseInt(video.statistics.commentCount || '0')
  return {
    id: video.id,
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
    publishedAt: video.snippet.publishedAt,
    viewCount,
    likeCount,
    commentCount,
    duration: parseDuration(video.contentDetails.duration),
    engagementRate: calculateEngagementRate(viewCount, likeCount, commentCount),
    trending: 'stable' as const,
  }
}

async function fetchAnalytics(channelUrl: string, apiKey: string, maxResults: number): Promise<AnalyticsData> {
  let channelId = extractChannelId(channelUrl)

  if (!channelId) throw new Error('Invalid YouTube channel URL')

  if (!channelId.startsWith('UC')) {
    const resolvedId = await getChannelByHandle(channelId, apiKey)
    if (!resolvedId) throw new Error('Channel not found')
    channelId = resolvedId
  }

  const channel = await getChannelInfo(channelId, apiKey)
  if (!channel) throw new Error('Channel not found')

  const videos = await getChannelVideos(channelId, apiKey, maxResults)

  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0)
  const avgViews = videos.length > 0 ? totalViews / videos.length : 0
  const avgEngagement = videos.length > 0
    ? videos.reduce((sum, v) => sum + v.engagementRate, 0) / videos.length
    : 0
  const topPerformer = videos.length > 0
    ? videos.reduce((max, v) => v.viewCount > max.viewCount ? v : max, videos[0])
    : null

  return { channel, videos, totalViews, avgViews, avgEngagement, topPerformer }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelUrl = searchParams.get('channel')
  const userApiKey = request.headers.get('X-Api-Key')
  const maxResults = Math.min(Math.max(parseInt(searchParams.get('maxResults') || '50') || 50, 1), 200)

  if (!channelUrl) {
    return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
  }

  const activeKey = userApiKey || DEFAULT_YOUTUBE_API_KEY

  if (!activeKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  try {
    // Try with the active key first
    try {
      const data = await fetchAnalytics(channelUrl, activeKey, maxResults)
      return NextResponse.json(data)
    } catch (err) {
      const isKeyError = (err as Error & { isApiKeyError?: boolean }).isApiKeyError
      // If it's a bad user-supplied key and we have a system fallback, retry with it
      if (isKeyError && userApiKey && DEFAULT_YOUTUBE_API_KEY) {
        const data = await fetchAnalytics(channelUrl, DEFAULT_YOUTUBE_API_KEY, maxResults)
        return NextResponse.json({ ...data, apiKeyWarning: 'Your API key is invalid — history tracking disabled. Update it in Settings.' })
      }
      // Bad key with no fallback
      if (isKeyError) {
        return NextResponse.json({ error: 'Your YouTube API key is invalid or has been revoked. Please update it in Settings.' }, { status: 401 })
      }
      throw err
    }
  } catch (error) {
    console.error('YouTube API error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to fetch channel data'
    const status = msg === 'Channel not found' ? 404 : msg === 'Invalid YouTube channel URL' ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
