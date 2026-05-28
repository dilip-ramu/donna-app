'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckSquare, Layers, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Task, Meeting } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

// ─── Chip colours (inline to avoid dynamic class issues in Tailwind) ──────────
const PRIORITY_CHIP: Record<string, { bg: string; text: string; bar: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626', bar: '#DC2626' },
  high:     { bg: '#FFF7ED', text: '#EA580C', bar: '#EA580C' },
  medium:   { bg: '#EDE9FE', text: '#7C3AED', bar: '#7C3AED' },
  low:      { bg: '#F8FAFC', text: '#64748B', bar: '#94A3B8' },
  someday:  { bg: '#F5F5F4', text: '#78716C', bar: '#A8A29E' },
}
const MEETING_CHIP = { bg: '#EFF6FF', text: '#2563EB', bar: '#2563EB' }

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CalDay {
  date: Date
  dateStr: string
  inMonth: boolean
  isToday: boolean
  tasks: Task[]
  meetings: Meeting[]
}

interface ConnectedSource {
  id: string
  name: string
  provider: 'google' | 'apple' | 'outlook' | 'tasks'
  color: string
  connected: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr(new Date())
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00') // noon avoids DST edge cases
  const today = todayStr()
  const tomorrow = localDateStr(new Date(Date.now() + 86400000))
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TaskChip({ task }: { task: Task }) {
  const chip = PRIORITY_CHIP[task.priority] ?? PRIORITY_CHIP.medium
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-none"
      style={{ background: chip.bg, color: chip.text }}
    >
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: chip.bar }} />
      <span className="truncate">{task.title}</span>
    </div>
  )
}

function MeetingChip({ meeting }: { meeting: Meeting }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-none"
      style={{ background: MEETING_CHIP.bg, color: MEETING_CHIP.text }}
    >
      <Layers size={8} className="shrink-0" />
      <span className="truncate">{meeting.title}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CalendarViewProps {
  tasks: Task[]
  meetings: Meeting[]
}

export default function CalendarView({ tasks, meetings }: CalendarViewProps) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())

  // Built-in "Tasks" source is always connected; external ones are UI stubs
  const [sources] = useState<ConnectedSource[]>([
    { id: 'tasks',   name: 'My Tasks',       provider: 'tasks',   color: '#7C3AED', connected: true },
    { id: 'google',  name: 'Google Calendar', provider: 'google',  color: '#EA4335', connected: false },
    { id: 'apple',   name: 'Apple Calendar',  provider: 'apple',   color: '#007AFF', connected: false },
    { id: 'outlook', name: 'Outlook',          provider: 'outlook', color: '#0078D4', connected: false },
  ])

  // ── Group by date ──────────────────────────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      ;(m[t.due_date] ??= []).push(t)
    }
    return m
  }, [tasks])

  const meetingsByDate = useMemo(() => {
    const m: Record<string, Meeting[]> = {}
    for (const mt of meetings) {
      if (!mt.meeting_date) continue
      ;(m[mt.meeting_date] ??= []).push(mt)
    }
    return m
  }, [meetings])

  // ── Build calendar grid ────────────────────────────────────────────────────
  const calDays = useMemo<CalDay[]>(() => {
    const y = viewDate.getFullYear()
    const mo = viewDate.getMonth()
    const firstWeekday = new Date(y, mo, 1).getDay()
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    const daysInPrev = new Date(y, mo, 0).getDate()
    const t = todayStr()
    const days: CalDay[] = []

    // Leading padding from previous month
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(y, mo - 1, daysInPrev - i)
      const ds = localDateStr(d)
      days.push({ date: d, dateStr: ds, inMonth: false, isToday: ds === t, tasks: tasksByDate[ds] ?? [], meetings: meetingsByDate[ds] ?? [] })
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, mo, day)
      const ds = localDateStr(d)
      days.push({ date: d, dateStr: ds, inMonth: true, isToday: ds === t, tasks: tasksByDate[ds] ?? [], meetings: meetingsByDate[ds] ?? [] })
    }

    // Trailing padding to complete last row
    let next = 1
    while (days.length % 7 !== 0) {
      const d = new Date(y, mo + 1, next++)
      const ds = localDateStr(d)
      days.push({ date: d, dateStr: ds, inMonth: false, isToday: ds === t, tasks: tasksByDate[ds] ?? [], meetings: meetingsByDate[ds] ?? [] })
    }

    return days
  }, [viewDate, tasksByDate, meetingsByDate])

  // ── Selected day ───────────────────────────────────────────────────────────
  const selTasks = tasksByDate[selectedDate] ?? []
  const selMeetings = meetingsByDate[selectedDate] ?? []
  const hasSelectedItems = selTasks.length > 0 || selMeetings.length > 0

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(todayStr())
  }

  const monthLabel = viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Calendar</h1>
          <p className="text-sm text-donna-muted mt-0.5">
            Your schedule, tasks, and events in one view
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)' }}
        >
          <Plus size={12} /> Add task
        </Link>
      </div>

      {/* ── Connected sources strip ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {sources.map(src => (
          <div
            key={src.id}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
              src.connected
                ? 'border-transparent'
                : 'border-dashed border-donna-border text-donna-muted hover:border-donna-text/30 cursor-pointer'
            )}
            style={src.connected ? { background: `${src.color}14`, color: src.color, border: `1px solid ${src.color}30` } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: src.connected ? src.color : '#D1D5DB' }}
            />
            {src.name}
            {src.connected && <span className="opacity-60 text-[9px]">✓</span>}
            {!src.connected && <span className="opacity-50 text-[9px]">+ connect</span>}
          </div>
        ))}
      </div>

      {/* ── Calendar card ───────────────────────────────────────────────────── */}
      <div className="donna-card overflow-hidden">
        {/* Blue accent bar */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #2563EB, #60A5FA 60%, transparent)' }} />

        <div className="p-4 sm:p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-donna-elevated
                           text-donna-muted hover:text-donna-text transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <h2 className="text-sm font-semibold text-donna-text min-w-[130px] text-center">
                {monthLabel}
              </h2>
              <button
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-donna-elevated
                           text-donna-muted hover:text-donna-text transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <button
              onClick={goToday}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-donna-border
                         text-donna-muted hover:text-donna-text hover:bg-donna-elevated transition-colors"
            >
              Today
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide
                                      text-donna-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-donna-border rounded-lg overflow-hidden">
            {calDays.map((day) => {
              const isSelected = day.dateStr === selectedDate
              const itemCount = day.tasks.length + day.meetings.length
              const MAX_CHIPS = 2

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={cn(
                    'bg-donna-surface min-h-[72px] sm:min-h-[88px] p-1.5 text-left align-top',
                    'transition-colors focus:outline-none',
                    !day.inMonth && 'bg-donna-bg/60',
                    isSelected && 'ring-2 ring-inset ring-donna-blue/40 bg-blue-50/40',
                    !isSelected && day.inMonth && 'hover:bg-donna-elevated/60',
                  )}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        'w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-medium leading-none',
                        day.isToday ? 'text-white' : day.inMonth ? 'text-donna-text' : 'text-donna-muted/50',
                      )}
                      style={day.isToday ? { background: '#2563EB' } : {}}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>

                  {/* Chips */}
                  <div className="space-y-0.5">
                    {day.tasks.slice(0, MAX_CHIPS).map(t => (
                      <TaskChip key={t.id} task={t} />
                    ))}
                    {day.tasks.length === 0 && day.meetings.slice(0, MAX_CHIPS).map(m => (
                      <MeetingChip key={m.id} meeting={m} />
                    ))}
                    {day.tasks.length > 0 && day.meetings.slice(0, Math.max(0, MAX_CHIPS - day.tasks.length)).map(m => (
                      <MeetingChip key={m.id} meeting={m} />
                    ))}
                    {itemCount > MAX_CHIPS && (
                      <p className="text-[9px] text-donna-muted font-medium px-1">
                        +{itemCount - MAX_CHIPS} more
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Selected day detail ─────────────────────────────────────────────── */}
      <div className="donna-card overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-donna-text">
              {formatDayHeader(selectedDate)}
            </h3>
            <span className="text-[11px] text-donna-muted">
              {selTasks.length + selMeetings.length === 0
                ? 'nothing scheduled'
                : `${selTasks.length + selMeetings.length} item${selTasks.length + selMeetings.length !== 1 ? 's' : ''}`
              }
            </span>
          </div>

          {!hasSelectedItems ? (
            <div className="py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-donna-elevated flex items-center justify-center mx-auto mb-3">
                <CheckSquare size={16} className="text-donna-muted" />
              </div>
              <p className="text-sm text-donna-muted">Nothing scheduled for this day.</p>
              <p className="text-xs text-donna-muted/70 mt-0.5">Add a task to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tasks section */}
              {selTasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-donna-muted mb-2 flex items-center gap-1.5">
                    <CheckSquare size={10} /> Tasks
                  </p>
                  <ul className="space-y-2">
                    {selTasks.map(task => {
                      const chip = PRIORITY_CHIP[task.priority] ?? PRIORITY_CHIP.medium
                      return (
                        <li key={task.id}
                          className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                          style={{ background: chip.bg }}>
                          <div className="w-1 shrink-0 self-stretch rounded-full mt-0.5"
                            style={{ background: chip.bar, minHeight: 14 }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-donna-text leading-snug">{task.title}</p>
                            {task.notes && (
                              <p className="text-xs text-donna-muted mt-0.5 line-clamp-2">{task.notes}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                                style={{ background: chip.bar + '20', color: chip.bar }}
                              >
                                {task.priority}
                              </span>
                              {task.due_time && (
                                <span className="text-[10px] text-donna-muted">{task.due_time.slice(0, 5)}</span>
                              )}
                              {task.project?.title && (
                                <span className="text-[10px] text-donna-muted truncate">
                                  {task.project.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Meetings section */}
              {selMeetings.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-donna-muted mb-2 flex items-center gap-1.5">
                    <Layers size={10} /> Meetings
                  </p>
                  <ul className="space-y-2">
                    {selMeetings.map(meeting => (
                      <li key={meeting.id}
                        className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                        style={{ background: MEETING_CHIP.bg }}>
                        <div className="w-1 shrink-0 self-stretch rounded-full"
                          style={{ background: MEETING_CHIP.bar, minHeight: 14 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-donna-text leading-snug">{meeting.title}</p>
                          {(meeting.start_time || meeting.location) && (
                            <div className="flex items-center gap-2 mt-1">
                              {meeting.start_time && (
                                <span className="text-[10px] text-donna-blue font-medium">
                                  {meeting.start_time.slice(0, 5)}
                                  {meeting.end_time ? ` – ${meeting.end_time.slice(0, 5)}` : ''}
                                </span>
                              )}
                              {meeting.location && (
                                <span className="text-[10px] text-donna-muted truncate">{meeting.location}</span>
                              )}
                            </div>
                          )}
                          {meeting.attendees?.length > 0 && (
                            <p className="text-[10px] text-donna-muted mt-0.5">
                              {meeting.attendees.join(', ')}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Connect external calendars ──────────────────────────────────────── */}
      <div className="donna-card overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-donna-text">Connect a calendar</h3>
            <span className="text-[10px] bg-donna-elevated text-donna-muted px-2 py-0.5 rounded-full">
              coming soon
            </span>
          </div>
          <p className="text-xs text-donna-muted mb-4">
            Sync your external calendars so Donna can see your full schedule.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Google Calendar */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-donna-border hover:border-donna-border/80 hover:bg-donna-elevated/50 transition-all cursor-not-allowed group">
              {/* Google coloured dot icon */}
              <div className="w-8 h-8 rounded-lg bg-donna-surface border border-donna-border flex items-center justify-center shrink-0 shadow-sm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="4" fill="#4285F4"/>
                  <path d="M8 4v4l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-donna-text leading-none">Google Calendar</p>
                <p className="text-[10px] text-donna-muted mt-0.5">gmail.com</p>
              </div>
              <ExternalLink size={11} className="text-donna-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Apple Calendar */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-donna-border hover:border-donna-border/80 hover:bg-donna-elevated/50 transition-all cursor-not-allowed group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="3" width="12" height="10" rx="1.5" fill="white" fillOpacity="0.9"/>
                  <rect x="1" y="3" width="12" height="3" rx="1" fill="white"/>
                  <circle cx="4" cy="2" r="0.8" fill="white"/>
                  <circle cx="10" cy="2" r="0.8" fill="white"/>
                  <rect x="3" y="8" width="2" height="1.5" rx="0.5" fill="#FF3B30"/>
                  <rect x="6" y="8" width="2" height="1.5" rx="0.5" fill="#FF3B30"/>
                  <rect x="9" y="8" width="2" height="1.5" rx="0.5" fill="#FF3B30"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-donna-text leading-none">Apple Calendar</p>
                <p className="text-[10px] text-donna-muted mt-0.5">iCloud / local</p>
              </div>
              <ExternalLink size={11} className="text-donna-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Outlook */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-donna-border hover:border-donna-border/80 hover:bg-donna-elevated/50 transition-all cursor-not-allowed group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: '#0078D4' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="0.5" fill="white" fillOpacity="0.9"/>
                  <rect x="8" y="2" width="4" height="5" rx="0.5" fill="white" fillOpacity="0.7"/>
                  <rect x="2" y="8" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.7"/>
                  <rect x="7" y="8" width="5" height="4" rx="0.5" fill="white" fillOpacity="0.9"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-donna-text leading-none">Outlook</p>
                <p className="text-[10px] text-donna-muted mt-0.5">Microsoft 365</p>
              </div>
              <ExternalLink size={11} className="text-donna-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <p className="text-[11px] text-donna-muted/60 mt-3 text-center">
            Calendar sync is coming in the next phase — stay tuned.
          </p>
        </div>
      </div>

    </div>
  )
}
