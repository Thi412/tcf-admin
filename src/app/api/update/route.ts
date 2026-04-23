import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, question, theme, difficulty, pour, contre, sampleOpinion } = body

    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const client = createServerClient()

    const { error: topicErr } = await client
      .from('topics')
      .update({ question: question.trim(), theme: theme.trim(), difficulty })
      .eq('id', id)

    if (topicErr) return NextResponse.json({ error: topicErr.message }, { status: 500 })

    await client.from('ideas_bank').delete().eq('topic_id', id)

    const ideas: any[] = []

    for (const idea of (pour ?? [])) {
      if (!idea.idea?.trim()) continue
      ideas.push({
        topic_id: id,
        position: 'pour',
        idea: idea.idea.trim(),
        ready_sentence: idea.example?.trim() ?? null,
        sample_opinion: null,
      })
    }

    for (const idea of (contre ?? [])) {
      if (!idea.idea?.trim()) continue
      ideas.push({
        topic_id: id,
        position: 'contre',
        idea: idea.idea.trim(),
        ready_sentence: idea.example?.trim() ?? null,
        sample_opinion: null,
      })
    }

    if (sampleOpinion?.trim()) {
      ideas.push({
        topic_id: id,
        position: 'pour',
        idea: 'Opinion modèle',
        ready_sentence: null,
        sample_opinion: sampleOpinion.trim(),
      })
    }

    if (ideas.length > 0) {
      const { error: ideasErr } = await client.from('ideas_bank').insert(ideas)
      if (ideasErr) return NextResponse.json({ error: ideasErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
