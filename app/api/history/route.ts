import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const rawKey = request.headers.get('X-Api-Key')
    const userKey = rawKey ? hashApiKey(rawKey) : null

    const query = supabase
      .from('search_history')
      .select('*')
      .order('searched_at', { ascending: false })
      .limit(50)

    if (userKey) {
      query.eq('user_key', userKey)
    } else {
      query.is('user_key', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('History fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const rawKey = request.headers.get('X-Api-Key')
    const userKey = rawKey ? hashApiKey(rawKey) : null

    const { data, error } = await supabase
      .from('search_history')
      .insert({
        channel_id: body.channelId,
        channel_name: body.channelName,
        channel_thumbnail: body.channelThumbnail,
        subscriber_count: body.subscriberCount,
        total_views: body.totalViews,
        video_count: body.videoCount,
        videos_analyzed: body.videosAnalyzed,
        avg_views: body.avgViews,
        avg_engagement: body.avgEngagement,
        videos_data: body.videosData,
        user_key: userKey,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('History save error:', error)
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const rawKey = request.headers.get('X-Api-Key')
    const userKey = rawKey ? hashApiKey(rawKey) : null

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const query = supabase
      .from('search_history')
      .delete()
      .eq('id', id)

    if (userKey) {
      query.eq('user_key', userKey)
    } else {
      query.is('user_key', null)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('History delete error:', error)
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 })
  }
}
