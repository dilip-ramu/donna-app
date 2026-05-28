'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InboxItem } from '@/lib/types'

export async function createInboxItem(
  rawContent: string,
  source: InboxItem['source'] = 'manual'
): Promise<{ data: InboxItem | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      user_id: user.id,
      raw_content: rawContent.trim(),
      source,
      status: 'unprocessed',
    })
    .select()
    .single()

  if (error) {
    console.error('[inbox:create]', error)
    return { data: null, error: error.message }
  }

  // Trigger AI processing in background (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${appUrl}/api/ai/process-inbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: data.id }),
  }).catch(err => console.error('[inbox:trigger-ai]', err))

  revalidatePath('/inbox')
  return { data: data as InboxItem, error: null }
}

export async function getMemoryNotes(limit = 30): Promise<InboxItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .ilike('raw_content', '[memory]%')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[inbox:get-memory]', error)
    return []
  }

  return (data ?? []) as InboxItem[]
}

export async function getInboxItems(limit = 50): Promise<InboxItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[inbox:get]', error)
    return []
  }

  return (data ?? []) as InboxItem[]
}

export async function dismissInboxItem(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('inbox_items')
    .update({ status: 'dismissed', deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/inbox')
}

export async function getUnprocessedCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('inbox_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'unprocessed')
    .is('deleted_at', null)

  return count ?? 0
}
