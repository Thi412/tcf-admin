import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function checkAuth(request: NextRequest) {
  const pwd = request.headers.get('x-admin-password')
  return pwd === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskType, topics } = body

    if (!taskType || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
    }

    const client = createServerClient()
    const results = { inserted: 0, errors: [] as string[] }

    for (const t of topics) {
      if (!t.question?.trim() || !t.theme?.trim()) {
        results.errors.push(`Sujet invalide (question ou thème manquant): ${t.question ?? '?'}`)
        continue
      }

      // Insert topic
      const { data: topic, error: topicErr } = await client
        .from('topics')
        .insert({
          task_type: taskType,
          question: t.question.trim(),
          theme: t.theme.trim(),
          difficulty: t.difficulty ?? 'B2',
          is_active: true,
        })
        .select()
        .single()

      if (topicErr || !topic) {
        results.errors.push(`Erreur topic "${t.question}": ${topicErr?.message}`)
        continue
      }

      // Build ideas
      const ideas: any[] = []
      let pos = 0

      for (const idea of (t.pour ?? [])) {
        if (!idea.idea?.trim()) continue
        ideas.push({
          topic_id: topic.id,
          position: 'pour',
          idea: idea.idea.trim(),
          example: idea.example?.trim() ?? null,
          ready_sentence: idea.example?.trim() ?? null,
          order_index: pos++,
          sample_opinion: null,
        })
      }

      for (const idea of (t.contre ?? [])) {
        if (!idea.idea?.trim()) continue
        ideas.push({
          topic_id: topic.id,
          position: 'contre',
          idea: idea.idea.trim(),
          example: idea.example?.trim() ?? null,
          ready_sentence: idea.example?.trim() ?? null,
          order_index: pos++,
          sample_opinion: null,
        })
      }

      if (t.sampleOpinion?.trim()) {
        ideas.push({
          topic_id: topic.id,
          position: 'pour',
          idea: 'Opinion modèle',
          example: null,
          ready_sentence: null,
          order_index: pos++,
          sample_opinion: t.sampleOpinion.trim(),
        })
      }

      if (ideas.length > 0) {
        const { error: ideasErr } = await client.from('ideas_bank').insert(ideas)
        if (ideasErr) results.errors.push(`Erreur idées "${t.question}": ${ideasErr.message}`)
      }

      results.inserted++
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
