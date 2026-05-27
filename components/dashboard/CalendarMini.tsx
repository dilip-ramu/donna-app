'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface CalEvent {
  id: string
  title: string
  start: string // ISO datetime
  end?: string
  allDay?: boolean
}

interface CalendarMiniProps {
  events?: CalEvent[]
}

function formatEventTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getDayName(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// Group events by day
function groupByDay(events: CalEvent[]) {
  const groups: Record<string, CalEvent[]> = {}
  for (const e of events) {
    const day = new Date(e.start).toDateString()
    if (!groups[day]) groups[day] = []
    groups[day].push(e)
  }
  return groups
}

const NOW_DAYS = 3 // show next 3 days

export default function CalendarMini({ events = [] }: CalendarMiniProps) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + NOW_DAYS * 24 * 60 * 60 * 1000)

  const upcoming = events
    .filter(e => new Date(e.start) >= now && new Date(e.start) <= cutoff)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const grouped = groupByDay(upcoming)
  const days = Object.keys(grouped)

  // Mini month calendar
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()

  const monthName = now.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Event dates for dots
  const eventDays = new Set(
    events
      .filter(e => {
        const d = new Date(e.start)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .map(e => new Date(e.start).getDate())
  )

  return (
    <div className="donna-card overflow-hidden">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #2563EB, #60A5FA)' }} />
      <div className="p-4">
      <div className="widget-header">
        <h2 className="text-sm font-semibold text-donna-text flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} />
          Calendar
        </h2>
        <Link href="/calendar" className="text-xs text-donna-muted hover:text-donna-blue flex items-center gap-0.5 transition-colors">
          Open <ChevronRight size={12} />
        </Link>
      </div>

      {/* Mini month grid */}
      <div className="mb-4">
        <p className="text-[11px] font-medium text-donna-muted mb-2">{monthName}</p>
        <div className="grid grid-cols-7 gap-0.5">
          {dayHeaders.map((h, i) => (
            <div key={i} className="text-center text-[10px] text-donna-muted font-medium py-0.5">{h}</div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className="relative flex flex-col items-center">
              {day && (
                <>
                  <div
                    className={cn(
                      'w-6 h-6 flex items-center justify-center rounded-full text-[11px] transition-colors',
                      day === today ? 'text-white font-medium' : 'text-donna-text hover:bg-donna-elevated cursor-default'
                    )}
                    style={day === today ? { background: '#2563EB' } : {}}
                  >
                    {day}
                  </div>
                  {eventDays.has(day) && day !== today && (
                    <span className="absolute bottom-0 w-1 h-1 rounded-full" style={{ background: '#60A5FA' }} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      {days.length === 0 ? (
        <div className="py-2 text-center border-t border-donna-border pt-3">
          <p className="text-xs text-donna-muted">No events in the next {NOW_DAYS} days.</p>
          <Link href="/calendar" className="text-xs hover:underline mt-0.5 inline-block" style={{ color: "#2563EB" }}>
            Connect calendar →
          </Link>
        </div>
      ) : (
        <div className="border-t border-donna-border pt-3 space-y-3">
          {days.map(day => (
            <div key={day}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-donna-muted mb-1.5">
                {getDayName(grouped[day][0].start)}
              </p>
              <ul className="space-y-1">
                {grouped[day].map(event => (
                  <li key={event.id} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "#60A5FA" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-donna-text truncate">{event.title}</p>
                    </div>
                    {!event.allDay && (
                      <span className="text-[10px] text-donna-muted shrink-0">
                        {formatEventTime(event.start)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
