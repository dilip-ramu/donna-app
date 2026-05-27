'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatDueDate } from '@/lib/utils/date'
import { getPriorityConfig } from '@/lib/utils/priority'
import { completeTask } from '@/lib/actions/tasks'
import type { Task } from '@/lib/types'

export default function TaskItem({ task }: { task: Task }) {
  const [done, setDone] = useState(task.status === 'done')
  const [isPending, startTransition] = useTransition()

  const { label: dueLabel, isOverdue, isToday, isSoon } = formatDueDate(task.due_date)
  const priority = getPriorityConfig(task.priority)

  function handleComplete() {
    if (done) return
    setDone(true)
    startTransition(async () => {
      await completeTask(task.id)
    })
  }

  return (
    <div className={cn(
      'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
      'hover:bg-donna-elevated border border-transparent hover:border-donna-border',
      done && 'opacity-40',
      isPending && 'opacity-60'
    )}>
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        aria-label={done ? 'Completed' : 'Mark complete'}
        className={cn(
          'w-4 h-4 rounded-full border flex-shrink-0 transition-all',
          'flex items-center justify-center',
          done
            ? 'bg-donna-gold border-donna-gold'
            : 'border-donna-border hover:border-donna-gold/60'
        )}
      >
        {done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3l2 2 4-4" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <span className={cn('priority-dot', priority.dotColor, 'opacity-70')} />

      {/* Title */}
      <span className={cn(
        'flex-1 text-sm leading-relaxed min-w-0 truncate',
        done ? 'line-through text-donna-muted' : 'text-donna-text'
      )}>
        {task.title}
      </span>

      {/* Project */}
      {task.project && (
        <span
          className="text-[10px] text-donna-muted hidden sm:block shrink-0"
          style={{ color: task.project.color ?? undefined }}
        >
          {task.project.icon} {task.project.title}
        </span>
      )}

      {/* Due date */}
      {dueLabel && (
        <span className={cn(
          'text-xs shrink-0 font-medium',
          isOverdue ? 'text-red-400' :
          isToday   ? 'text-donna-gold' :
          isSoon    ? 'text-orange-400' :
          'text-donna-muted'
        )}>
          {dueLabel}
        </span>
      )}
    </div>
  )
}
