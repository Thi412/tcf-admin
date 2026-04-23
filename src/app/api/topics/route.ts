import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskType = searchParams.get('task') ?? 'tache3'
  const client = createServerClient()
  const { data: topics, error } = await client
    .from('topics')
    .select('id, task_type, question, theme, difficulty, is_active')
    .eq('task_type', taskType)
    .order('theme')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ topics: topics ?? [] })
}
