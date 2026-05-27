import Link from 'next/link'
import { Meeting } from '@/lib/types'

// Dot colours for calendar events — cycle through these
const DOT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6B7280', '#EF4444']

interface CalEvent {
  id: string
  time: string   // e.g. "09:30 AM"
  title: string
  subtitle?: string
  dotColor: string
  isCurrent?: boolean
}

interface CalendarDayWidgetProps {
  dateLabel: string
  meetings: Meeting[]
}

function buildEvents(meetings: Meeting[]): CalEvent[] {
  return meetings
    .filter(m => m.start_time)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    .map((m, i) => {
      const [hStr, minStr] = (m.start_time ?? '00:00').split(':')
      const h = parseInt(hStr)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return {
        id: m.id,
        time: `${String(h12).padStart(2, '0')}:${minStr} ${ampm}`,
        title: m.title,
        subtitle: m.location ?? undefined,
        dotColor: DOT_COLORS[i % DOT_COLORS.length],
        isCurrent: false,
      }
    })
}

export default function CalendarDayWidget({ dateLabel, meetings }: CalendarDayWidgetProps) {
  const events = buildEvents(meetings)

  // Mark the "current" event based on time of day
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  if (events.length > 0) {
    let bestIdx = 0
    let bestDiff = Infinity
    events.forEach((e, i) => {
      const [time, ampm] = e.time.split(' ')
      const [h, m] = time.split(':').map(Number)
      const h24 = ampm === 'PM' && h !== 12 ? h + 12 : ampm === 'AM' && h === 12 ? 0 : h
      const eventMinutes = h24 * 60 + m
      const diff = Math.abs(eventMinutes - nowMinutes)
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
    })
    events[bestIdx].isCurrent = true
  }

  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-donna-text">Calendar</h2>
          <p className="text-xs text-donna-muted mt-0.5">{dateLabel}</p>
        </div>
        <Link href="/calendar"
          className="text-xs font-medium text-donna-violet hover:underline">
          View week
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {events.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-donna-muted">No meetings today.</p>
          <Link href="/calendar" className="text-xs text-donna-violet hover:underline mt-1 inline-block">
            Open calendar →
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map(event => (
            <div
              key={event.id}
              className="flex items-start gap-3 py-2.5 border-b border-donna-border last:border-0"
              style={event.isCurrent ? { background: '#F5F3FF', margin: '0 -20px', padding: '10px 20px', borderRadius: 8 } : {}}
            >
              {/* Time */}
              <span className="text-[11px] text-donna-muted font-medium w-16 shrink-0 pt-0.5">
                {event.time}
              </span>
              {/* Dot */}
              <span
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ background: event.isCurrent ? '#1F2937' : event.dotColor }}
              />
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${event.isCurrent ? 'text-donna-text' : 'text-donna-text'}`}>
                  {event.title}
                </p>
                {event.subtitle && (
                  <p className="text-[11px] text-donna-muted mt-0.5">{event.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
