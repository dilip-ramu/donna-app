import Link from 'next/link'
import { Users } from 'lucide-react'
import { Meeting } from '@/lib/types'
import DashboardCard, { CardBody, CardList } from './dashboard-card'

const EVENT_COLORS = [
  { bg: '#EDE9FE', border: '#7C3AED', text: '#5B21B6' },
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },
  { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' },
]

interface ParsedEvent {
  id: string
  title: string
  location?: string
  attendeeCount: number
  startMinutes: number
  endMinutes: number
  startLabel: string
  endLabel: string
  durationMins: number
  isCurrent: boolean
  colorIdx: number
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

interface CalendarCardProps {
  dateLabel: string
  meetings: Meeting[]
}

export default function CalendarCard({ dateLabel, meetings }: CalendarCardProps) {
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

  const events: ParsedEvent[] = meetings
    .filter(m => m.start_time)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    .map((m, i) => {
      const startMins = parseTime(m.start_time ?? '00:00')
      const endMins   = m.end_time ? parseTime(m.end_time) : startMins + 60
      const duration  = endMins - startMins

      return {
        id: m.id,
        title: m.title,
        location: m.location ?? undefined,
        attendeeCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
        startMinutes: startMins,
        endMinutes: endMins,
        startLabel: fmtTime(startMins),
        endLabel: fmtTime(endMins),
        durationMins: duration,
        isCurrent: nowMins >= startMins && nowMins < endMins,
        colorIdx: i % EVENT_COLORS.length,
      }
    })

  // If no meeting is current, highlight the next upcoming one
  if (events.length > 0 && !events.some(e => e.isCurrent)) {
    const next = events.find(e => e.startMinutes > nowMins)
    if (next) next.isCurrent = true
  }

  // Next meeting countdown
  const nextMeeting = events.find(e => e.startMinutes > nowMins)
  const minsUntilNext = nextMeeting ? nextMeeting.startMinutes - nowMins : null

  function formatCountdown(mins: number): string {
    if (mins < 1)  return 'Starting now'
    if (mins < 60) return `in ${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`
  }

  return (
    <DashboardCard>
      <CardBody>
        <div className="flex items-start justify-between mb-3 shrink-0">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-donna-text leading-none">Today's schedule</h2>
            <p className="text-[11px] text-donna-subtle mt-0.5">{dateLabel}</p>
          </div>
          <Link href="/calendar" className="text-xs font-medium text-[#7C3AED] hover:underline shrink-0">
            Full calendar →
          </Link>
        </div>

        {/* Next meeting pill */}
        {nextMeeting && minsUntilNext !== null && minsUntilNext <= 120 && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 shrink-0"
            style={{ background: 'var(--c-violet-bg)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse shrink-0" />
            <p className="text-xs text-[#7C3AED] font-medium flex-1 min-w-0 truncate">
              {nextMeeting.title}
            </p>
            <span className="text-[11px] font-semibold text-[#7C3AED] shrink-0">
              {formatCountdown(minsUntilNext)}
            </span>
          </div>
        )}

        <CardList>
          {events.length === 0 ? (
            <div className="py-8 text-center">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--c-violet-bg)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="#7C3AED" strokeWidth="1.5" />
                  <path d="M6 2v2M12 2v2" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 7h14" stroke="#7C3AED" strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-sm text-donna-muted">No meetings today</p>
              <Link href="/calendar" className="text-xs text-[#7C3AED] hover:underline mt-1 inline-block">
                Add to calendar →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                const c = EVENT_COLORS[event.colorIdx]
                return (
                  <div
                    key={event.id}
                    className="flex gap-3 items-stretch"
                  >
                    {/* Time column */}
                    <div className="w-14 shrink-0 flex flex-col items-end pt-1.5">
                      <span className="text-[10px] font-medium text-donna-subtle tabular-nums leading-none">
                        {event.startLabel.split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-donna-subtle mt-0.5">
                        {event.startLabel.split(' ')[1]}
                      </span>
                    </div>

                    {/* Event block */}
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5 min-w-0 relative overflow-hidden"
                      style={{
                        background: event.isCurrent ? c.bg : '#FAFAFA',
                        borderLeft: `3px solid ${event.isCurrent ? c.border : '#E8E8EE'}`,
                        borderRadius: '0 10px 10px 0',
                      }}
                    >
                      {/* Current indicator pulse */}
                      {event.isCurrent && (
                        <span
                          className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: c.border }}
                        />
                      )}

                      <p
                        className="text-sm font-medium leading-snug truncate"
                        style={{ color: event.isCurrent ? c.text : '#374151' }}
                      >
                        {event.title}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px]" style={{ color: event.isCurrent ? c.border : '#9CA3AF' }}>
                          {event.durationMins}min
                        </span>
                        {event.location && (
                          <>
                            <span className="text-donna-subtle">·</span>
                            <span className="text-[10px] text-donna-subtle truncate max-w-[90px]">
                              {event.location}
                            </span>
                          </>
                        )}
                        {event.attendeeCount > 0 && (
                          <>
                            <span className="text-donna-subtle">·</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-donna-subtle">
                              <Users size={9} strokeWidth={2} />
                              {event.attendeeCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardList>
      </CardBody>
    </DashboardCard>
  )
}
