'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Pause, Play } from 'lucide-react'
import { Task, Priority } from '@/lib/types'
import DashboardCard, { CardBody, CardList, CardFooter } from './dashboard-card'

// Priority config
const P_CONFIG: Record<Priority, { label: string; border: string; dot: string }> = {
  critical: { label: 'Critical', border: '#EF4444', dot: '#EF4444' },
  high:     { label: 'High',     border: '#F97316', dot: '#F97316' },
  medium:   { label: 'Medium',   border: '#F59E0B', dot: '#F59E0B' },
  low:      { label: 'Low',      border: '#10B981', dot: '#10B981' },
  someday:  { label: 'Someday',  border: '#D1D5DB', dot: '#9CA3AF' },
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low', 'someday']

function formatDueLabel(task: Task, today: string): string {
  if (!task.due_date) return ''
  if (task.due_date < today) {
    const days = Math.round(
      (new Date(today).getTime() - new Date(task.due_date + 'T12:00:00').getTime()) / 86400000
    )
    return days === 1 ? 'Due yesterday' : `${days} days overdue`
  }
  if (task.due_date === today) return task.due_time ? task.due_time.slice(0, 5) : 'Due today'
  return ''
}

interface TodayCardProps {
  tasks: Task[]
  completedToday: number
  dateLabel: string
}

export default function TodayCard({ tasks, completedToday, dateLabel }: TodayCardProps) {
  const today = new Date().toISOString().split('T')[0]

  // Optimistic local state for status transitions
  const [done, setDone]         = useState<Set<string>>(new Set())
  const [promoted, setPromoted] = useState<Set<string>>(new Set()) // active → in_progress
  const [paused, setPaused]     = useState<Set<string>>(new Set()) // in_progress → active
  const [, startTransition]     = useTransition()

  // Derive effective status for each task
  const effectiveInProgress = (t: Task) =>
    !done.has(t.id) &&
    ((promoted.has(t.id) && !paused.has(t.id)) ||
     (t.status === 'in_progress' && !paused.has(t.id)))

  const activeTasks = tasks.filter(t => !done.has(t.id))
  const inProgress  = activeTasks.filter(effectiveInProgress)
  const pending     = activeTasks.filter(t => !effectiveInProgress(t))

  // Group pending by priority
  const grouped = PRIORITY_ORDER
    .map(p => ({ priority: p, tasks: pending.filter(t => t.priority === p) }))
    .filter(g => g.tasks.length > 0)

  const completedCount = completedToday + done.size
  const totalCount     = tasks.length + completedToday

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCheck = (id: string) => {
    setDone(prev => { const s = new Set(prev); s.add(id); return s })
    startTransition(async () => {
      try { const { completeTask } = await import('@/lib/actions/tasks'); await completeTask(id) }
      catch { /* optimistic */ }
    })
  }

  const handleStart = (id: string) => {
    setPromoted(prev => { const s = new Set(prev); s.add(id); return s })
    setPaused(prev => { const s = new Set(prev); s.delete(id); return s })
    startTransition(async () => {
      try {
        const { updateTask } = await import('@/lib/actions/tasks')
        await updateTask(id, { status: 'in_progress' })
      } catch { /* optimistic */ }
    })
  }

  const handlePause = (id: string) => {
    setPaused(prev => { const s = new Set(prev); s.add(id); return s })
    setPromoted(prev => { const s = new Set(prev); s.delete(id); return s })
    startTransition(async () => {
      try {
        const { updateTask } = await import('@/lib/actions/tasks')
        await updateTask(id, { status: 'active' })
      } catch { /* optimistic */ }
    })
  }

  return (
    <DashboardCard>
      <CardBody>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3 shrink-0">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-[#111827] leading-none">Today's work</h2>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Completion ring */}
            <div className="flex items-center gap-1.5">
              <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                <circle cx="14" cy="14" r="11" fill="none" stroke="#F0F0F5" strokeWidth="3" />
                <circle
                  cx="14" cy="14" r="11" fill="none" stroke="#7C3AED" strokeWidth="3"
                  strokeDasharray="69.12"
                  strokeDashoffset={`${69.12 * (1 - Math.min(1, completedCount / Math.max(1, totalCount)))}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="text-[11px] text-[#9CA3AF] font-medium tabular-nums">
                {completedCount}/{totalCount}
              </span>
            </div>
            <Link
              href="/tasks"
              className="w-7 h-7 rounded-lg bg-[#F0F0F5] flex items-center justify-center
                         hover:bg-[#E8E8EE] transition-colors"
              title="All tasks"
            >
              <Plus size={14} className="text-[#6B7280]" />
            </Link>
          </div>
        </div>

        <CardList>
          {tasks.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#111827]">All clear</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Nothing left for today.</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* ══ IN PROGRESS ══════════════════════════════════════════════ */}
              {inProgress.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C3AED]">
                      In Progress
                    </span>
                    <span className="text-[10px] text-[#C4C4CC]">· {inProgress.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {inProgress.map(task => {
                      const isDone    = done.has(task.id)
                      const dueLabel  = formatDueLabel(task, today)
                      const isOverdue = task.due_date && task.due_date < today

                      return (
                        <div
                          key={task.id}
                          className="group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
                          style={{
                            background: 'rgba(124,58,237,0.05)',
                            borderLeft: '2.5px solid #7C3AED',
                          }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => handleCheck(task.id)}
                            className="shrink-0 flex items-center justify-center rounded-full border-2
                                       transition-all duration-150"
                            style={{
                              width: 18, height: 18,
                              borderColor: '#7C3AED',
                              background: isDone ? '#7C3AED' : 'transparent',
                            }}
                            aria-label="Mark done"
                          >
                            {isDone && (
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.8"
                                  strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>

                          {/* Title + due */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium text-[#111827] leading-snug truncate"
                              style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.4 : 1 }}
                            >
                              {task.title}
                            </p>
                            {dueLabel && (
                              <p className="text-[10px] mt-0.5"
                                style={{ color: isOverdue ? '#EF4444' : '#7C3AED' }}>
                                {dueLabel}
                              </p>
                            )}
                          </div>

                          {/* Pause — appears on hover */}
                          <button
                            onClick={() => handlePause(task.id)}
                            title="Pause — move back to pending"
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0
                                       flex items-center gap-1 text-[10px] font-medium
                                       text-[#9CA3AF] hover:text-[#6B7280]
                                       px-2 py-0.5 rounded-lg hover:bg-[#F0F0F5]"
                          >
                            <Pause size={9} strokeWidth={2} />
                            Pause
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ══ PENDING ══════════════════════════════════════════════════ */}
              {pending.length > 0 && (
                <section>
                  {/* Section label only visible when there's also an In Progress section */}
                  {inProgress.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#D1D5DB] shrink-0" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        Pending
                      </span>
                      <span className="text-[10px] text-[#C4C4CC]">· {pending.length}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {grouped.map(({ priority, tasks: ptasks }) => {
                      const cfg = P_CONFIG[priority]
                      return (
                        <div key={priority}>
                          {/* Priority group header */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: cfg.dot }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-[#C4C4CC]">· {ptasks.length}</span>
                          </div>

                          <div className="space-y-1">
                            {ptasks.map(task => {
                              const isDone    = done.has(task.id)
                              const dueLabel  = formatDueLabel(task, today)
                              const isOverdue = task.due_date && task.due_date < today

                              return (
                                <div
                                  key={task.id}
                                  className="group flex items-center gap-3 py-2 px-3 rounded-xl
                                             hover:bg-[#FAFAFA] transition-colors cursor-default"
                                  style={{ borderLeft: `2.5px solid ${cfg.border}` }}
                                >
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => handleCheck(task.id)}
                                    className="shrink-0 flex items-center justify-center rounded-full border-2
                                               transition-all duration-150"
                                    style={{
                                      width: 18, height: 18,
                                      borderColor: isDone ? cfg.border : '#D1D5DB',
                                      background: isDone ? cfg.border : 'transparent',
                                    }}
                                    aria-label="Mark done"
                                  >
                                    {isDone && (
                                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.8"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </button>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className="text-sm text-[#111827] leading-snug truncate"
                                      style={{
                                        textDecoration: isDone ? 'line-through' : 'none',
                                        opacity: isDone ? 0.4 : 1,
                                        fontWeight: priority === 'critical' || priority === 'high' ? 500 : 400,
                                      }}
                                    >
                                      {task.title}
                                    </p>
                                    {dueLabel && (
                                      <p className="text-[10px] mt-0.5"
                                        style={{ color: isOverdue ? '#EF4444' : '#9CA3AF' }}>
                                        {dueLabel}
                                      </p>
                                    )}
                                  </div>

                                  {/* Start — appears on hover */}
                                  <button
                                    onClick={() => handleStart(task.id)}
                                    title="Mark as working on it"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0
                                               flex items-center gap-1 text-[10px] font-medium
                                               text-[#7C3AED] hover:text-[#6D28D9]
                                               px-2 py-0.5 rounded-lg hover:bg-[#F5F3FF]"
                                  >
                                    <Play size={9} strokeWidth={2.5} />
                                    Start
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Session completion note */}
              {done.size > 0 && (
                <p className="text-[11px] text-[#9CA3AF] text-center py-1">
                  ✓ {done.size} marked done this session
                </p>
              )}

            </div>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            All tasks <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
