'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, ExternalLink, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { VideoMetrics, SortField, SortOrder, TimeFilter, VideoTypeFilter } from '@/lib/types'

interface VideoTableProps {
  videos: VideoMetrics[]
}

const PAGE_SIZE = 25

function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getTimeFilterDate(filter: TimeFilter): Date | null {
  const now = new Date()
  switch (filter) {
    case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '3months': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    default: return null
  }
}

function durationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function isShort(duration: string): boolean {
  return durationToSeconds(duration) <= 60
}

function TrendingIcon({ trending }: { trending: 'up' | 'down' | 'stable' }) {
  if (trending === 'up') return <TrendingUp className="w-4 h-4 text-chart-2" />
  if (trending === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />
  return <Minus className="w-4 h-4 text-muted-foreground" />
}

export function VideoTable({ videos }: VideoTableProps) {
  const [sortField, setSortField] = useState<SortField>('viewCount')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [videoType, setVideoType] = useState<VideoTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...videos]

    if (videoType === 'shorts') filtered = filtered.filter(v => isShort(v.duration))
    else if (videoType === 'regular') filtered = filtered.filter(v => !isShort(v.duration))

    const filterDate = getTimeFilterDate(timeFilter)
    if (filterDate) filtered = filtered.filter(v => new Date(v.publishedAt) >= filterDate)

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(v => v.title.toLowerCase().includes(query))
    }

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'viewCount': comparison = a.viewCount - b.viewCount; break
        case 'likeCount': comparison = a.likeCount - b.likeCount; break
        case 'commentCount': comparison = a.commentCount - b.commentCount; break
        case 'publishedAt': comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(); break
        case 'engagementRate': comparison = a.engagementRate - b.engagementRate; break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [videos, sortField, sortOrder, timeFilter, videoType, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedVideos.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedVideos = filteredAndSortedVideos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    return sortOrder === 'desc'
      ? <ArrowDown className="w-4 h-4 ml-1" />
      : <ArrowUp className="w-4 h-4 ml-1" />
  }

  const Pagination = () => (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {filteredAndSortedVideos.length === 0
          ? '0'
          : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredAndSortedVideos.length)}`
        } of {filteredAndSortedVideos.length} videos
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={safePage <= 1}>
          <ChevronLeft className="w-4 h-4" />
          Prev
        </Button>
        <span className="text-sm text-muted-foreground px-1">
          Page {safePage} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={safePage >= totalPages}>
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            className="w-full sm:w-64 bg-card"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={videoType} onValueChange={handleFilterChange(setVideoType)}>
            <SelectTrigger className="flex-1 sm:w-36 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Videos</SelectItem>
              <SelectItem value="shorts">Shorts only</SelectItem>
              <SelectItem value="regular">Regular only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={handleFilterChange(setTimeFilter)}>
            <SelectTrigger className="flex-1 sm:w-36 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="3months">Past 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {pagedVideos.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No videos found matching your criteria</p>
        ) : (
          pagedVideos.map((video) => (
            <a
              key={video.id}
              href={`https://youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="relative w-28 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                <div className="absolute bottom-1 right-1 bg-background/90 text-foreground text-xs px-1 rounded">
                  {video.duration}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">{video.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{formatNumber(video.viewCount)} views</span>
                  <span>{formatNumber(video.likeCount)} likes</span>
                  <span>{video.engagementRate.toFixed(2)}% eng.</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatDate(video.publishedAt)}</span>
                  <TrendingIcon trending={video.trending} />
                </div>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-100">Video</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort('viewCount')}>
                  Views <SortIcon field="viewCount" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort('likeCount')}>
                  Likes <SortIcon field="likeCount" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort('commentCount')}>
                  Comments <SortIcon field="commentCount" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort('engagementRate')}>
                  Engagement <SortIcon field="engagementRate" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort('publishedAt')}>
                  Published <SortIcon field="publishedAt" />
                </Button>
              </TableHead>
              <TableHead className="w-10">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No videos found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              pagedVideos.map((video) => (
                <TableRow key={video.id} className="border-border">
                  <TableCell>
                    <a
                      href={`https://youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <div className="relative w-24 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                        <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                        <div className="absolute bottom-1 right-1 bg-background/90 text-foreground text-xs px-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </p>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                      </div>
                    </a>
                  </TableCell>
                  <TableCell className="font-medium">{formatNumber(video.viewCount)}</TableCell>
                  <TableCell>{formatNumber(video.likeCount)}</TableCell>
                  <TableCell>{formatNumber(video.commentCount)}</TableCell>
                  <TableCell>{video.engagementRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(video.publishedAt)}</TableCell>
                  <TableCell><TrendingIcon trending={video.trending} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination />
    </div>
  )
}
