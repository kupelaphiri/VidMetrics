import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Create search_history table
    const { error: historyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS search_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          channel_id TEXT NOT NULL,
          channel_name TEXT NOT NULL,
          channel_thumbnail TEXT,
          subscriber_count BIGINT DEFAULT 0,
          total_views BIGINT DEFAULT 0,
          video_count INTEGER DEFAULT 0,
          videos_analyzed INTEGER DEFAULT 0,
          avg_views BIGINT DEFAULT 0,
          avg_engagement DECIMAL(5,2) DEFAULT 0,
          searched_at TIMESTAMPTZ DEFAULT NOW(),
          videos_data JSONB
        );
      `
    })

    // Create user_settings table
    const { error: settingsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          videos_to_fetch INTEGER DEFAULT 50,
          auto_export BOOLEAN DEFAULT false,
          export_format TEXT DEFAULT 'csv',
          notifications_enabled BOOLEAN DEFAULT true,
          theme TEXT DEFAULT 'dark',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    // Try direct table creation approach instead
    // First check if tables exist by trying to select from them
    const { error: checkHistory } = await supabase
      .from('search_history')
      .select('id')
      .limit(1)

    const { error: checkSettings } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1)

    return NextResponse.json({ 
      success: true,
      historyExists: !checkHistory,
      settingsExists: !checkSettings,
      message: 'Database check complete'
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ error: 'Failed to initialize' }, { status: 500 })
  }
}
