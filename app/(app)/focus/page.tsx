import { createClient } from '@/lib/supabase/server'
import { Task } from '@/lib/types'
import FocusClient from './focus-client'

export const metadata = { title: 'Focus — Donna' }

export default async function FocusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [inProgressRes, activeRes] = await Promise.all([
    (supabase as any)
      .from('tasks').select('*').eq('user_id', user.id)
      .is('deleted_at', null).eq('status', 'in_progress')
      .order('updated_at', { ascending: false }).limit(10),

    (supabase as any)
      .from('tasks').select('id, title, priority, due_date').eq('user_id', user.id)
      .is('deleted_at', null).eq('status', 'active')
      .neq('priority', 'someday')
      .order('priority', { ascending: true }).limit(15),
  ])

  return (
    <FocusClient
      inProgress={(inProgressRes.data ?? []) as Task[]}
      active={(activeRes.data ?? []) as Task[]}
    />
  )
}
