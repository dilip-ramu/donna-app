import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { categorizeInboxItem } from '@/lib/ai/categorize'
import type { Json } from '@/lib/types/database'

export async function POST(request: Request) {
  try {
    const { item_id } = await request.json() as { item_id: string }
    if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

    const supabase = createServiceClient()

    // Fetch the inbox item
    const { data: item, error: fetchError } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('id', item_id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Mark as processing
    await supabase
      .from('inbox_items')
      .update({ status: 'processing' })
      .eq('id', item_id)

    // Get user's projects for context
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .eq('user_id', item.user_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    // Categorize with AI
    const result = await categorizeInboxItem(
      item.raw_content,
      projects ?? []
    )

    // Create the promoted entity
    let promoted_to: string | null = null
    let promoted_id: string | null = null
    const now = new Date().toISOString()

    if (result.category === 'task') {
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          user_id: item.user_id,
          title: result.title || item.raw_content.slice(0, 80),
          status: 'active',
          priority: result.urgency ?? 'medium',
          due_date: result.deadline ?? null,
          project_id: result.project_id ?? null,
          ai_metadata: result as unknown as Json,
        })
        .select('id')
        .single()

      if (task) {
        promoted_to = 'task'
        promoted_id = task.id

        await supabase.from('activity_log').insert({
          user_id: item.user_id,
          entity_type: 'task',
          entity_id: task.id,
          action: 'created',
          actor: 'ai',
          metadata: { source: 'inbox', inbox_item_id: item_id },
        })
      }
    } else if (result.category === 'idea') {
      const { data: idea } = await supabase
        .from('ideas')
        .insert({
          user_id: item.user_id,
          title: result.title || item.raw_content.slice(0, 80),
          description: item.raw_content,
          status: 'raw',
          project_id: result.project_id ?? null,
          ai_metadata: result as unknown as Json,
        })
        .select('id')
        .single()

      if (idea) {
        promoted_to = 'idea'
        promoted_id = idea.id
      }
    }
    // For 'note', 'memory', 'reminder', 'meeting' categories:
    // we just record the AI metadata and auto-dismiss — no separate entity created yet.
    // The content is preserved in raw_content + ai_metadata for future search.

    // Auto-dismiss: once processed, clear from the inbox view.
    // This keeps the inbox lean — only truly unprocessed items appear.
    await supabase
      .from('inbox_items')
      .update({
        status: 'processed',
        processed_at: now,
        promoted_to,
        promoted_id,
        ai_metadata: result as unknown as Json,
      })
      .eq('id', item_id)

    return NextResponse.json({ success: true, category: result.category, promoted_to, promoted_id })
  } catch (err) {
    console.error('[api:process-inbox]', err)

    // Mark as unprocessed so it can be retried
    try {
      const { item_id } = await (request.clone().json()) as { item_id: string }
      const supabase = createServiceClient()
      await supabase
        .from('inbox_items')
        .update({ status: 'unprocessed' })
        .eq('id', item_id)
    } catch { /* ignore */ }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
