export interface VideoMetrics {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
  engagementRate: number
  trending: 'up' | 'down' | 'stable'
}

export interface ChannelInfo {
  id: string
  title: string
  description: string
  thumbnail: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  customUrl: string
}

export interface AnalyticsData {
  channel: ChannelInfo
  videos: VideoMetrics[]
  totalViews: number
  avgViews: number
  avgEngagement: number
  topPerformer: VideoMetrics | null
}

export type SortField = 'viewCount' | 'likeCount' | 'commentCount' | 'publishedAt' | 'engagementRate'
export type SortOrder = 'asc' | 'desc'
export type TimeFilter = 'all' | 'week' | 'month' | '3months'
export type VideoTypeFilter = 'all' | 'shorts' | 'regular'

export interface ChannelInsights {
  bullets: string[]
}

export interface SharedReport {
  id: string
  channel: ChannelInfo
  videos: VideoMetrics[]
  totalViews: number
  avgViews: number
  avgEngagement: number
  topPerformer: VideoMetrics | null
  created_at: string
}
