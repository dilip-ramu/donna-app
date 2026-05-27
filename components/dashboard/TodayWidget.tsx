'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { Task } from '@/lib/types'
import { completeTask } from '@/lib/actions/tasks'
import { cn } from '@/lib/utils/cn'

const PRIORITY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  critical: { label: 'Critical', bg: '#FEF2F2', color: '#EF4444' },
  high:     { label: 'High',     bg: '#FEF2F2', color: '#EF4444' },
  medium:   { label: 'Medium',   bg: '#FFFBEB', color: '#F59E0B' },
  low:      { label: 'Low',      bg: '#F0FDF4', color: '#10B981' },
  someday:  { label: 'Someday',  bg: '#F9FAFB', color: '#9CA3AF' },
}

function formatSub(task: Task): string {
  const parts: string[] = []
  if (task.due_time) {
    const [h, m] = task.due_time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    parts.push(`${h12}:${m} ${ampm}`)
  }
  if (task.notes) parts.push(task.notes.slice(0, 40))
  return parts.join(' · ')
}

interface TodayWidgetProps {
  tasks: Task[]
  completedToday: number
  dateLabel: string
}

export default function TodayWidget({ tasks, completedToday, dateLabel }: TodayWidgetProps) {
  const [localDone, setLocalDone] = useState<Set<string>>(new Set())
  const visible = tasks.filter(t => !localDone.has(t.id))

  const handleCheck = async (taskId: string) => {
    setLocalDone(prev => new Set([...prev, taskId]))
    await completeTask(taskId)
  }

  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-donna-text">Today</h2>
          <p className="text-xs text-donna-muted mt-0.5">{dateLabel}</p>
        </div>
        <button className="text-donna-subtle hover:text-donna-muted transition-colors p-0.5">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {visible.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-donna-muted">
            {completedToday > 0
              ? `All ${completedToday} tasks done — great work!`
              : 'No tasks for today.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-0">
          {visible.map(task => {
            const badge = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.medium
            const sub = formatSub(task)
            return (
              <li key={task.id}
                className="flex items-start gap-3 py-2.5 border-b border-donna-border last:border-0 group">
                {/* Checkbox */}
                <button
                  onClick={() => handleCheck(task.id)}
                  className="mt-0.5 w-4 h-4 rounded-full border-2 border-donna-border shrink-0
                             hover:border-donna-violet transition-colors group-hover:border-donna-violet/50"
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-donna-text leading-snug">{task.title}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {sub && (
                    <p className="text-[11px] text-donna-muted mt-0.5 leading-snug">{sub}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      <Link
        href="/tasks"
        className="block mt-3 text-xs font-medium text-donna-violet hover:underline"
      >
        View all tasks
      </Link>
    </div>
  )
}
