import Link from 'next/link'
import { Calendar, ChevronRight } from 'lucide-react'
import { Task, Meeting } from '@/lib/types'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'

interface UpcomingItem {
  id: string
  title: string
  dateLabel: string
  type: 'task' | 'meeting'
  sortKey: string
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

interface UpcomingCardProps {
  tasks: Task[]
  meetings: Meeting[]
}

export default function UpcomingCard({ tasks, meetings }: UpcomingCardProps) {
  const today = new Date().toISOString().split('T')[0]

  const futureTasks: UpcomingItem[] = tasks
    .filter(t => t.due_date && t.due_date > today)
    .map(t => ({
      id: t.id,
      title: t.title,
      dateLabel: formatUpcomingDate(t.due_date!),
      type: 'task' as const,
      sortKey: t.due_date!,
    }))

  const futureMeetings: UpcomingItem[] = meetings
    .filter(m => m.meeting_date && m.meeting_date > today)
    .map(m => ({
      id: m.id,
      title: m.title,
      dateLabel: m.start_time
        ? `${formatUpcomingDate(m.meeting_date!)}, ${m.start_time.slice(0, 5)}`
        : formatUpcomingDate(m.meeting_date!),
      type: 'meeting' as const,
      sortKey: m.meeting_date!,
    }))

  const all = [...futureTasks, ...futureMeetings]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(0, 5)

  return (
    <DashboardCard>
      <CardBody>
        <CardHeader title="Upcoming" />

        <CardList>
          {all.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#6B7280]">Nothing coming up.</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">Add a task with a due date to see it here.</p>
            </div>
          ) : (
            <ul>
              {all.map(item => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-3 py-2.5 border-b border-[#F3F3F7] last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#F0F0F5] flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar size={13} className="text-[#6B7280]" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] leading-snug truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-[#9CA3AF]">{item.dateLabel}</p>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{
                          background: item.type === 'meeting' ? '#EFF6FF' : '#EDE9FE',
                          color: item.type === 'meeting' ? '#3B82F6' : '#7C3AED',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/calendar"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            View all <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
