'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, CheckSquare } from 'lucide-react'
import { Task, Meeting } from '@/lib/types'
import DashboardCard from './dashboard-card'

type CalView = 'day' | 'week' | 'month'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
  someday:  '#9CA3AF',
}

const MEETING_COLORS = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Returns Sunday of the week containing d
function weekStart(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  return r
}

// Returns the first day of the month
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

interface DayData {
  tasks: Task[]
  meetings: Meeting[]
}

interface FullCalendarCardProps {
  tasks: Task[]
  meetings: Meeting[]
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({ dateStr, dayData, todayStr }: { dateStr: string; dayData: DayData; todayStr: string }) {
  const { tasks, meetings } = dayData
  const allEmpty = tasks.length === 0 && meetings.length === 0

  // Sort meetings by start_time
  const sortedMeetings = [...meetings].sort((a, b) =>
    (a.start_time ?? '').localeCompare(b.start_time ?? '')
  )

  return (
    <div className="px-5 py-4 space-y-4">
      {allEmpty ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F5F3FF' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="#7C3AED" strokeWidth="1.5"/>
              <path d="M6 2v2M12 2v2" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 7h14" stroke="#7C3AED" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-sm text-[#9CA3AF]">Nothing scheduled</p>
          <Link href="/calendar" className="text-xs text-[#7C3AED] hover:underline mt-1 inline-block">Add something →</Link>
        </div>
      ) : (
        <>
          {/* Meetings */}
          {sortedMeetings.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Meetings</p>
              <div className="space-y-2">
                {sortedMeetings.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: MEETING_COLORS[i % MEETING_COLORS.length] + '12', borderLeft: `3px solid ${MEETING_COLORS[i % MEETING_COLORS.length]}` }}>
                    <Clock size={12} style={{ color: MEETING_COLORS[i % MEETING_COLORS.length] }} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{m.title}</p>
                      {m.start_time && (
                        <p className="text-[10px] text-[#9CA3AF]">{fmtTime(m.start_time)}{m.end_time ? ` – ${fmtTime(m.end_time)}` : ''}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Tasks</p>
              <div className="space-y-1.5">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#FAFAFA]"
                    style={{ borderLeft: `2.5px solid ${PRIORITY_COLOR[t.priority] ?? '#E5E7EB'}` }}>
                    <CheckSquare size={12} className="shrink-0 text-[#D1D5DB]" />
                    <p className="flex-1 text-sm text-[#111827] truncate">{t.title}</p>
                    {t.due_date && t.due_date < todayStr && (
                      <span className="text-[9px] font-medium text-[#EF4444] shrink-0">overdue</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  baseDate, dayMap, todayStr, onDayClick,
}: {
  baseDate: Date
  dayMap: Record<string, DayData>
  todayStr: string
  onDayClick: (d: Date) => void
}) {
  const start = weekStart(baseDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="flex-1 px-4 py-3">
      <div className="grid grid-cols-7 gap-1 h-full">
        {days.map(day => {
          const ds = toDateStr(day)
          const data = dayMap[ds] ?? { tasks: [], meetings: [] }
          const isToday = ds === todayStr
          const totalItems = data.tasks.length + data.meetings.length
          const hasOverdue = data.tasks.some(t => t.due_date && t.due_date < todayStr)

          return (
            <button
              key={ds}
              onClick={() => onDayClick(day)}
              className={`flex flex-col rounded-xl p-2 text-left transition-all min-h-[120px]
                ${isToday
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#FAFAFA] hover:bg-[#F0EDF8] text-[#111827]'
                }`}
            >
              {/* Day header */}
              <div className="shrink-0 mb-1.5">
                <p className={`text-[9px] font-medium uppercase tracking-wide ${isToday ? 'text-[rgba(255,255,255,0.7)]' : 'text-[#9CA3AF]'}`}>
                  {DAY_LABELS[day.getDay()]}
                </p>
                <p className={`text-sm font-bold leading-none mt-0.5 ${isToday ? 'text-white' : 'text-[#111827]'}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Events */}
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {data.meetings.slice(0, 2).map((m, i) => (
                  <div
                    key={m.id}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-md truncate"
                    style={isToday
                      ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                      : { background: MEETING_COLORS[i % MEETING_COLORS.length] + '20', color: MEETING_COLORS[i % MEETING_COLORS.length] }
                    }
                  >
                    {m.start_time ? `${fmtTime(m.start_time).split(' ')[0]} ` : ''}{m.title}
                  </div>
                ))}
                {data.tasks.slice(0, 3 - Math.min(data.meetings.length, 2)).map(t => (
                  <div
                    key={t.id}
                    className="text-[9px] px-1.5 py-0.5 rounded-md truncate"
                    style={isToday
                      ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }
                      : { background: '#F0F0F5', color: '#6B7280' }
                    }
                  >
                    {t.title}
                  </div>
                ))}
                {totalItems > 3 && (
                  <p className={`text-[9px] mt-auto ${isToday ? 'text-[rgba(255,255,255,0.6)]' : 'text-[#9CA3AF]'}`}>
                    +{totalItems - 3} more
                  </p>
                )}
              </div>

              {/* Overdue dot */}
              {hasOverdue && !isToday && (
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  baseDate, dayMap, todayStr, onDayClick,
}: {
  baseDate: Date
  dayMap: Record<string, DayData>
  todayStr: string
  onDayClick: (d: Date) => void
}) {
  const ms = monthStart(baseDate)
  const firstDow = ms.getDay() // 0=Sun

  // Build grid cells (pad with prev month days)
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate() }, (_, i) =>
      new Date(ms.getFullYear(), ms.getMonth(), i + 1)
    ),
  ]
  // Pad to complete rows of 7
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="px-4 py-3">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="h-14" />
              const ds = toDateStr(day)
              const data = dayMap[ds] ?? { tasks: [], meetings: [] }
              const isToday = ds === todayStr
              const isCurrentMonth = day.getMonth() === baseDate.getMonth()
              const totalItems = data.tasks.length + data.meetings.length
              const hasMeeting = data.meetings.length > 0
              const hasTask = data.tasks.length > 0

              return (
                <button
                  key={ds}
                  onClick={() => onDayClick(day)}
                  className={`h-14 rounded-xl flex flex-col items-center pt-1.5 transition-all relative
                    ${isToday ? 'bg-[#7C3AED]' : isCurrentMonth ? 'bg-[#FAFAFA] hover:bg-[#F0EDF8]' : 'bg-transparent hover:bg-[#F9FAFB]'}
                  `}
                >
                  <span className={`text-[11px] font-semibold leading-none
                    ${isToday ? 'text-white' : isCurrentMonth ? 'text-[#111827]' : 'text-[#D1D5DB]'}
                  `}>
                    {day.getDate()}
                  </span>

                  {/* Dots for events */}
                  {totalItems > 0 && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {hasMeeting && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-[#7C3AED]'}`} />
                      )}
                      {hasTask && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-[rgba(255,255,255,0.6)]' : 'bg-[#F59E0B]'}`} />
                      )}
                      {totalItems > 2 && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-[rgba(255,255,255,0.4)]' : 'bg-[#E5E7EB]'}`} />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#F0F0F5]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
          <span className="text-[9px] text-[#9CA3AF]">Meeting</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span className="text-[9px] text-[#9CA3AF]">Task</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FullCalendarCard({ tasks, meetings }: FullCalendarCardProps) {
  const [view, setView] = useState<CalView>('week')
  const [baseDate, setBaseDate] = useState(new Date())

  const todayStr = toDateStr(new Date())

  const navigate = (dir: 1 | -1) => {
    const next = new Date(baseDate)
    if (view === 'day')   next.setDate(next.getDate() + dir)
    if (view === 'week')  next.setDate(next.getDate() + 7 * dir)
    if (view === 'month') next.setMonth(next.getMonth() + dir)
    setBaseDate(next)
  }

  // Build day map
  const dayMap = useMemo<Record<string, DayData>>(() => {
    const map: Record<string, DayData> = {}
    const ensure = (ds: string) => { if (!map[ds]) map[ds] = { tasks: [], meetings: [] } }

    for (const t of tasks) {
      if (t.due_date) { ensure(t.due_date); map[t.due_date].tasks.push(t) }
    }
    for (const m of meetings) {
      if (m.meeting_date) { ensure(m.meeting_date); map[m.meeting_date].meetings.push(m) }
    }
    return map
  }, [tasks, meetings])

  const titleLabel = useMemo(() => {
    if (view === 'day') {
      return baseDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (view === 'week') {
      const start = weekStart(baseDate)
      const end = addDays(start, 6)
      const s = start.toLocaleDateString([], { day: 'numeric', month: 'short' })
      const e = end.toLocaleDateString([], { day: 'numeric', month: 'short' })
      return `${s} – ${e}`
    }
    return baseDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
  }, [view, baseDate])

  const dayStr = toDateStr(baseDate)
  const currentDayData = dayMap[dayStr] ?? { tasks: [], meetings: [] }

  return (
    <DashboardCard>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex flex-col px-4 pt-3.5 pb-2.5 shrink-0 border-b border-[#F0F0F5] gap-2">

          {/* Row 1: view toggle (left) + Open link (right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {(['day', 'week', 'month'] as CalView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-[11px] font-medium rounded-lg transition-colors ${
                    view === v
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-[#6B7280] hover:bg-[#F4F4F8]'
                  }`}
                  style={{ minWidth: 48, minHeight: 34, padding: '0 10px' }}
                >
                  {/* Full label on md+, abbreviated on mobile */}
                  <span className="hidden sm:inline">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  <span className="sm:hidden">{v.charAt(0).toUpperCase()}</span>
                </button>
              ))}
            </div>
            <Link
              href="/calendar"
              className="text-[11px] font-medium text-[#7C3AED] hover:underline"
            >
              Open →
            </Link>
          </div>

          {/* Row 2: prev / title / next / today */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-[#F4F4F8] text-[#6B7280] transition-colors shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="flex-1 text-sm font-semibold text-[#111827] text-center truncate">
              {titleLabel}
            </span>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-[#F4F4F8] text-[#6B7280] transition-colors shrink-0"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setBaseDate(new Date())}
              className="ml-1 text-[10px] font-medium px-2 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280]
                         hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors shrink-0"
              style={{ minHeight: 28 }}
            >
              Today
            </button>
          </div>
        </div>

        {/* ── View body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {view === 'day' && (
            <DayView
              dateStr={dayStr}
              dayData={currentDayData}
              todayStr={todayStr}
            />
          )}
          {view === 'week' && (
            <WeekView
              baseDate={baseDate}
              dayMap={dayMap}
              todayStr={todayStr}
              onDayClick={d => { setBaseDate(d); setView('day') }}
            />
          )}
          {view === 'month' && (
            <MonthView
              baseDate={baseDate}
              dayMap={dayMap}
              todayStr={todayStr}
              onDayClick={d => { setBaseDate(d); setView('day') }}
            />
          )}
        </div>
      </div>
    </DashboardCard>
  )
}
