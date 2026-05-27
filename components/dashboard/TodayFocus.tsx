'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Task } from '@/lib/types'
import { completeTask } from '@/lib/actions/tasks'
import { PRIORITY_CONFIG } from '@/lib/utils/priority'
import { formatDueDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface TodayFocusProps {
  tasks: Task[]
  completedToday: number
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? completed / total : 0
  const offset = circumference * (1 - pct)
  const displayPct = Math.round(pct * 100)

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      {/* Track */}
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#E2DAF5" strokeWidth="7" />
      {/* Progress */}
      {total > 0 && (
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      )}
      {/* Centre label */}
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="500" fill="#1A1040">
        {displayPct}%
      </text>
    </svg>
  )
}

export default function TodayFocus({ tasks, completedToday }: TodayFocusProps) {
  const total = tasks.length + completedToday
  const [completing, setCompleting] = useState<string | null>(null)
  const [localDone, setLocalDone] = useState<Set<string>>(new Set())

  const visibleTasks = tasks.filter(t => !localDone.has(t.id))
  const localCompleted = completedToday + localDone.size

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId)
    setLocalDone(prev => new Set([...prev, taskId]))
    await completeTask(taskId)
    setCompleting(null)
  }

  return (
    <div className="donna-card overflow-hidden">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }} />
      <div className="p-4">
      <div className="widget-header">
        <h2 className="text-sm font-semibold text-donna-text flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
          Today&apos;s focus
        </h2>
        <Link href="/tasks" className="text-xs text-donna-muted hover:text-donna-gold flex items-center gap-0.5 transition-colors">
          All tasks <ChevronRight size={12} />
        </Link>
      </div>

      {/* Progress row */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-donna-border">
        <ProgressRing completed={localCompleted} total={total} />
        <div>
          <p className="text-2xl font-semibold text-donna-text leading-none">
            {localCompleted} <span className="text-donna-muted font-normal text-base">/ {total}</span>
          </p>
          <p className="text-xs text-donna-muted mt-1">tasks complete</p>
          {visibleTasks.length > 0 ? (
            <p className="text-xs text-donna-gold font-medium mt-1.5">
              {visibleTasks.length} remaining
            </p>
          ) : (
            <p className="text-xs text-green-600 font-medium mt-1.5">All done today ✓</p>
          )}
        </div>
      </div>

      {/* Task list */}
      {visibleTasks.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-donna-muted">Nothing left — well done.</p>
          <Link href="/tasks" className="text-xs text-donna-gold hover:underline mt-1 inline-block">
            Add more tasks →
          </Link>
        </div>
      ) : (
        <ul className="space-y-0 divide-y divide-donna-border">
          {visibleTasks.slice(0, 5).map(task => {
            const pConfig = PRIORITY_CONFIG[task.priority]
            const dueInfo = task.due_date ? formatDueDate(task.due_date) : null
            const isDone = completing === task.id

            return (
              <li
                key={task.id}
                className={cn(
                  'flex items-center gap-3 py-2.5 group transition-opacity',
                  isDone && 'opacity-40'
                )}
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={isDone}
                  className="shrink-0 text-donna-muted hover:text-donna-gold transition-colors"
                >
                  {isDone
                    ? <CheckCircle2 size={16} className="text-donna-gold" />
                    : <Circle size={16} className="group-hover:text-donna-gold/60" />
                  }
                </button>

                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: pConfig.dotColor }}
                />

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm text-donna-text leading-snug truncate',
                    isDone && 'line-through text-donna-muted'
                  )}>
                    {task.title}
                  </p>
                </div>

                {dueInfo && dueInfo.label && (
                  <span className={cn(
                    'text-[10px] shrink-0 font-medium px-1.5 py-0.5 rounded-full',
                    dueInfo.isOverdue
                      ? 'bg-red-50 text-red-600'
                      : dueInfo.isToday
                      ? 'bg-donna-gold/10 text-donna-gold'
                      : 'bg-donna-elevated text-donna-muted'
                  )}>
                    {dueInfo.label}
                  </span>
                )}
              </li>
            )
          })}
          {visibleTasks.length > 5 && (
            <li className="pt-2">
              <Link href="/tasks" className="text-xs text-donna-muted hover:text-donna-gold transition-colors">
                +{visibleTasks.length - 5} more tasks
              </Link>
            </li>
          )}
        </ul>
      )}
      </div>
    </div>
  )
}
