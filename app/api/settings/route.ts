import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          videos_to_fetch: 50,
          auto_export: false,
          export_format: 'csv',
          notifications_enabled: true,
          theme: 'dark',
        })
      }
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          videos_to_fetch: body.videos_to_fetch,
          auto_export: body.auto_export,
          export_format: body.export_format,
          notifications_enabled: body.notifications_enabled,
          theme: body.theme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          videos_to_fetch: body.videos_to_fetch,
          auto_export: body.auto_export,
          export_format: body.export_format,
          notifications_enabled: body.notifications_enabled,
          theme: body.theme,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
