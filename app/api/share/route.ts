import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('shared_reports')
      .insert({ report_data: body })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('shared_reports')
      .select('report_data, created_at')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    return NextResponse.json({ ...data.report_data, created_at: data.created_at })
  } catch (error) {
    console.error('Share fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
