import Link from 'next/link'
import { Calendar, ChevronRight } from 'lucide-react'
import { Task, Meeting } from '@/lib/types'

interface UpcomingItem {
  id: string
  title: string
  dateLabel: string
  type: 'task' | 'meeting'
}

function formatUpcomingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

  const daysDiff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 7) return d.toLocaleDateString([], { weekday: 'long' })

  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

interface UpcomingWidgetProps {
  tasks: Task[]
  meetings: Meeting[]
}

export default function UpcomingWidget({ tasks, meetings }: UpcomingWidgetProps) {
  const today = new Date().toISOString().split('T')[0]

  // Future tasks (due after today)
  const futureTasks: UpcomingItem[] = tasks
    .filter(t => t.due_date && t.due_date > today)
    .map(t => ({
      id: t.id,
      title: t.title,
      dateLabel: formatUpcomingDate(t.due_date!),
      type: 'task' as const,
    }))

  // Future meetings
  const futureMeetings: UpcomingItem[] = meetings
    .filter(m => m.meeting_date && m.meeting_date > today)
    .map(m => ({
      id: m.id,
      title: m.title,
      dateLabel: m.start_time
        ? `${formatUpcomingDate(m.meeting_date!)}, ${m.start_time.slice(0, 5)}`
        : formatUpcomingDate(m.meeting_date!),
      type: 'meeting' as const,
    }))

  // Merge and sort by date, take top 4
  const all = [...futureTasks, ...futureMeetings]
    .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))
    .slice(0, 4)

  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-donna-text">Upcoming</h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {all.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-donna-muted">Nothing coming up.</p>
        </div>
      ) : (
        <ul className="space-y-0">
          {all.map(item => (
            <li
              key={item.id}
              className="flex items-start gap-3 py-2.5 border-b border-donna-border last:border-0"
            >
              <div className="w-7 h-7 rounded-lg bg-donna-elevated flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={13} className="text-donna-muted" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-donna-text leading-snug truncate">{item.title}</p>
                <p className="text-[11px] text-donna-muted mt-0.5">{item.dateLabel}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>

      <Link
        href="/calendar"
        className="flex items-center gap-1 mt-3 text-xs font-medium text-donna-violet hover:underline"
      >
        View all <ChevronRight size={12} />
      </Link>
    </div>
  )
}
