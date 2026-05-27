import { createClient } from '@/lib/supabase/server'
import { InboxItem } from '@/lib/types'
import ReferencesClient from './references-client'

export const metadata = { title: 'References — Donna' }

export default async function ReferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase as any)
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .ilike('raw_content', '[reference]%')
    .order('created_at', { ascending: false })
    .limit(100)

  return <ReferencesClient refs={(data ?? []) as InboxItem[]} />
}
