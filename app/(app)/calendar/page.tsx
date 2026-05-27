import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/CalendarView'
import { Task, Meeting } from '@/lib/types'

export const metadata: Metadata = { title: 'Calendar — Donna' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch a rolling window: 2 months ago → 4 months ahead
  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - 2)
  windowStart.setDate(1)
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + 4)
  windowEnd.setDate(0)

  const startStr = windowStart.toISOString().split('T')[0]
  const endStr = windowEnd.toISOString().split('T')[0]

  const [tasksRes, meetingsRes] = await Promise.all([
    // Tasks that have a due_date in the window (or all active tasks — we show them on their due date)
    (supabase as any)
      .from('tasks')
      .select('*, project:projects(id, title, color, icon)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .not('due_date', 'is', null)
      .gte('due_date', startStr)
      .lte('due_date', endStr)
      .order('due_date', { ascending: true })
      .limit(300) as { data: Task[] | null },

    // Meetings with a meeting_date in the window
    (supabase as any)
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('meeting_date', 'is', null)
      .gte('meeting_date', startStr)
      .lte('meeting_date', endStr)
      .order('meeting_date', { ascending: true })
      .limit(200) as { data: Meeting[] | null },
  ])

  const tasks    = (tasksRes.data ?? []) as Task[]
  const meetings = (meetingsRes.data ?? []) as Meeting[]

  return <CalendarView tasks={tasks} meetings={meetings} />
}
