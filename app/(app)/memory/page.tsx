import { createClient } from '@/lib/supabase/server'
import { InboxItem } from '@/lib/types'
import MemoryPageClient from './memory-client'

export const metadata = { title: 'Memory — Donna' }

export default async function MemoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase as any)
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .ilike('raw_content', '[memory]%')
    .order('created_at', { ascending: false })
    .limit(100)

  return <MemoryPageClient notes={(data ?? []) as InboxItem[]} />
}
