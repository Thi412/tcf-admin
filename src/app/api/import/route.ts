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
    const { taskType, topics } = body

    if (!taskType || !Array.isArray(topics)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
    }

    const client = createServerClient()
    let inserted = 0
    const errors: string[] = []

    for (const topic of topics) {
      try {
        // 1. Insert topic
        const { data: topicData, error: topicError } = await client
          .from('topics')
          .insert({
            question: topic.question?.trim(),
            theme: topic.theme?.trim() ?? '',
            difficulty: topic.difficulty ?? 'B2',
            task_type: taskType,
            is_active: true,
          })
          .select('id')
          .single()

        if (topicError) {
          errors.push(`Erreur topic "${topic.question}": ${topicError.message}`)
          continue
        }

        const topicId = topicData.id

        // 2. Build ideas — only columns that exist in ideas_bank
        const ideas: any[] = []
        let orderIndex = 0

        for (const idea of (topic.pour ?? [])) {
          if (!idea.idea?.trim()) continue
          ideas.push({
            topic_id: topicId,
            position: 'pour',
            idea: idea.idea.trim(),
            ready_sentence: idea.example?.trim() ?? null,
            sample_opinion: null,
            order_index: orderIndex++,
          })
        }

        for (const idea of (topic.contre ?? [])) {
          if (!idea.idea?.trim()) continue
          ideas.push({
            topic_id: topicId,
            position: 'contre',
            idea: idea.idea.trim(),
            ready_sentence: idea.example?.trim() ?? null,
            sample_opinion: null,
            order_index: orderIndex++,
          })
        }

        if (topic.sampleOpinion?.trim()) {
          ideas.push({
            topic_id: topicId,
            position: 'pour',
            idea: 'Opinion modèle',
            ready_sentence: null,
            sample_opinion: topic.sampleOpinion.trim(),
            order_index: orderIndex++,
          })
        }

        if (ideas.length > 0) {
          const { error: ideasError } = await client
            .from('ideas_bank')
            .insert(ideas)

          if (ideasError) {
            errors.push(`Erreur idées "${topic.question}": ${ideasError.message}`)
          }
        }

        inserted++
      } catch (err: any) {
        errors.push(`Exception "${topic.question}": ${err.message}`)
      }
    }

    return NextResponse.json({ inserted, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
