import { createClient } from '@/lib/supabase/server'
import { Task, Idea } from '@/lib/types'
import SomedayClient from './someday-client'

export const metadata = { title: 'Someday — Donna' }

export default async function SomedayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [tasksRes, ideasRes] = await Promise.all([
    (supabase as any)
      .from('tasks').select('*').eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done').neq('status', 'archived')
      .eq('priority', 'someday')
      .order('created_at', { ascending: false }).limit(50),

    (supabase as any)
      .from('ideas').select('*').eq('user_id', user.id)
      .is('deleted_at', null)
      .in('status', ['raw', 'shelved'])
      .order('created_at', { ascending: false }).limit(30),
  ])

  return (
    <SomedayClient
      tasks={(tasksRes.data ?? []) as Task[]}
      ideas={(ideasRes.data ?? []) as Idea[]}
    />
  )
}
