import { createClient } from '@/lib/supabase/server'
import { Task, Meeting, Project, Idea, InboxItem } from '@/lib/types'

import Topbar          from '@/components/donna/topbar'
import StatsBar        from '@/components/donna/stats-bar'
import OverdueBanner   from '@/components/donna/overdue-banner'
import TodayCard       from '@/components/donna/today-card'
import ProjectsCard    from '@/components/donna/projects-card'
import MemoryCard      from '@/components/donna/memory-card'
import IdeasCard       from '@/components/donna/ideas-card'
import FullCalendarCard from '@/components/donna/full-calendar-card'
import FocusStrip      from '@/components/donna/focus-strip'

export const metadata = { title: 'Home — Donna' }

function getTagline(overdueCount: number, tasksToday: number, completedToday: number): string {
  if (overdueCount > 0) return `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} need your attention.`
  if (tasksToday === 0) return "Clear day — great time to plan or capture ideas."
  if (completedToday > 0 && completedToday >= tasksToday) return "Everything's done today — exceptional work."
  if (completedToday > 0) return `${completedToday} of ${tasksToday} tasks done — keep the momentum.`
  return `${tasksToday} task${tasksToday > 1 ? 's' : ''} lined up for today.`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const twoMonths = new Date()
  twoMonths.setMonth(twoMonths.getMonth() + 2)
  const twoMonthsStr = twoMonths.toISOString().split('T')[0]

  // Past 2 weeks for overdue calendar range
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0]

  const [
    todayTasksRes,
    inProgressTasksRes,
    overdueTasksRes,
    upcomingTasksRes,
    completedRes,
    inboxCountRes,
    todayMeetingsRes,
    upcomingMeetingsRes,
    projectsRes,
    profileRes,
    ideasRes,
    memoryRes,
  ] = await Promise.all([
    // Active tasks due today
    (supabase as any)
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .neq('status', 'archived')
      .eq('due_date', today)
      .order('priority', { ascending: true })
      .limit(25),

    // In-progress tasks (regardless of due date — user is actively working on these)
    (supabase as any)
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(10),

    // Overdue tasks (due before today)
    (supabase as any)
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .neq('status', 'archived')
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .gte('due_date', twoWeeksAgoStr)
      .order('due_date', { ascending: true })
      .limit(15),

    // Upcoming tasks (next 2 months) for full calendar
    (supabase as any)
      .from('tasks')
      .select('id, title, due_date, priority, status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .neq('status', 'archived')
      .not('due_date', 'is', null)
      .gt('due_date', today)
      .lte('due_date', twoMonthsStr)
      .order('due_date', { ascending: true })
      .limit(60),

    // Completed today
    (supabase as any)
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done')
      .gte('completed_at', today),

    // Total inbox (unprocessed)
    (supabase as any)
      .from('inbox_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('dismissed_at', null),

    // Today's meetings
    (supabase as any)
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('meeting_date', today)
      .order('start_time', { ascending: true })
      .limit(10),

    // Upcoming meetings (next 2 months) for full calendar
    (supabase as any)
      .from('meetings')
      .select('id, title, meeting_date, start_time, end_time, location, attendees')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('meeting_date', 'is', null)
      .gt('meeting_date', today)
      .lte('meeting_date', twoMonthsStr)
      .order('meeting_date', { ascending: true })
      .limit(40),

    // Active projects with task counts
    (supabase as any)
      .from('projects')
      .select(`
        *,
        task_count:tasks(count),
        active_task_count:tasks(count)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(6),

    // Profile
    (supabase as any)
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single(),

    // Ideas (active, excluding shelved)
    (supabase as any)
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'shelved')
      .order('created_at', { ascending: false })
      .limit(8),

    // Memory notes (for dashboard card)
    (supabase as any)
      .from('inbox_items')
      .select('*')
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .ilike('raw_content', '[memory]%')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const todayTasks      = (todayTasksRes.data      ?? []) as Task[]
  const inProgressTasks = (inProgressTasksRes.data ?? []) as Task[]
  const overdueTasks    = (overdueTasksRes.data    ?? []) as Task[]
  const upcomingTasks = (upcomingTasksRes.data ?? []) as Task[]
  const completedToday = (completedRes as any).count ?? 0
  const inboxTotal    = (inboxCountRes as any).count  ?? 0
  const todayMeetings = (todayMeetingsRes.data  ?? []) as Meeting[]
  const upcomingMtgs  = (upcomingMeetingsRes.data ?? []) as Meeting[]
  const ideas         = (ideasRes.data ?? []) as Idea[]
  const memoryNotes   = (memoryRes.data ?? []) as InboxItem[]

  // Projects — Supabase returns count as array
  const rawProjects = (projectsRes.data ?? []) as any[]
  const projects: (Project & { task_count: number; active_task_count: number })[] = rawProjects.map(p => ({
    ...p,
    task_count:        Array.isArray(p.task_count)        ? (p.task_count[0]?.count ?? 0)        : (p.task_count ?? 0),
    active_task_count: Array.isArray(p.active_task_count) ? (p.active_task_count[0]?.count ?? 0) : (p.active_task_count ?? 0),
  }))

  const profileData = (profileRes as any).data as { display_name: string | null } | null
  const displayName = profileData?.display_name ?? user.email?.split('@')[0] ?? 'there'

  const overdueCount   = overdueTasks.length
  const tasksToday     = todayTasks.length
  const activeProjects = projects.length

  const dateLabel = new Date().toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Today card: in-progress first (always visible), then overdue, then due-today
  // Deduplicate — a task may appear in both inProgressTasks and todayTasks
  const seenIds = new Set<string>()
  const allTodayTasks: Task[] = []
  for (const t of [...inProgressTasks, ...overdueTasks, ...todayTasks]) {
    if (!seenIds.has(t.id)) { seenIds.add(t.id); allTodayTasks.push(t) }
  }

  // Full calendar: all tasks across date range (overdue + today + upcoming)
  const calendarTasks: Task[] = [...overdueTasks, ...todayTasks, ...upcomingTasks]

  // All meetings for calendar
  const allMeetings: Meeting[] = [...todayMeetings, ...upcomingMtgs]

  const GAP = 'clamp(12px, 1.5vw, 16px)'

  return (
    <div className="animate-fade-in flex flex-col min-h-full" style={{ gap: GAP }}>

      {/* ── Greeting header ── */}
      <Topbar
        displayName={displayName}
        tagline={getTagline(overdueCount, tasksToday, completedToday)}
        taglineSub=""
      />

      {/* ── Stats row ── */}
      <StatsBar
        tasksToday={tasksToday}
        completedToday={completedToday}
        overdueCount={overdueCount}
        inboxCount={inboxTotal}
        activeProjects={activeProjects}
      />

      {/* ── Overdue alert ── */}
      <OverdueBanner tasks={overdueTasks} />

      {/*
        ── Row 1: Today's tasks | Full Calendar ──
        flex-1 so it fills available vertical space
      */}
      <div
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2"
        style={{ gap: GAP, minHeight: 360 }}
      >
        <TodayCard
          tasks={allTodayTasks}
          completedToday={completedToday}
          dateLabel={dateLabel}
        />

        <FullCalendarCard
          tasks={calendarTasks}
          meetings={allMeetings}
        />
      </div>

      {/*
        ── Row 2: Ideas | Memory | Projects ──
        shrink-0 so it doesn't collapse; fixed height
      */}
      <div
        className="shrink-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        style={{ gap: GAP, height: 'clamp(260px, 22vh, 300px)' }}
      >
        <IdeasCard ideas={ideas} />
        <MemoryCard notes={memoryNotes} />
        <div className="hidden xl:flex flex-col min-h-0">
          <ProjectsCard projects={projects} />
        </div>
      </div>

      {/* ── Focus strip ── */}
      <FocusStrip />

    </div>
  )
}
