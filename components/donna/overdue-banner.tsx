'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, ChevronRight } from 'lucide-react'
import { Task } from '@/lib/types'

interface OverdueBannerProps {
  tasks: Task[]
}

export default function OverdueBanner({ tasks }: OverdueBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || tasks.length === 0) return null

  const shown = tasks.slice(0, 3)
  const rest  = tasks.length - shown.length

  function getDaysOverdue(dueDate: string): string {
    const days = Math.round(
      (new Date().getTime() - new Date(dueDate + 'T12:00:00').getTime()) / 86400000
    )
    return days === 1 ? '1 day' : `${days} days`
  }

  return (
    <div
      className="shrink-0 rounded-2xl border overflow-hidden mb-4"
      style={{ background: '#FFF5F5', borderColor: '#FECACA' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#FECACA]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
            <AlertTriangle size={13} className="text-[#EF4444]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#991B1B]">
            {tasks.length} overdue task{tasks.length > 1 ? 's' : ''} need attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="text-xs font-medium text-[#EF4444] hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight size={11} />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-[#FCA5A5] hover:text-[#EF4444] transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {shown.map(task => (
          <div key={task.id} className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
            <span className="text-xs text-[#7F1D1D] font-medium truncate max-w-[200px]">
              {task.title}
            </span>
            {task.due_date && (
              <span className="text-[10px] text-[#FCA5A5] shrink-0">
                {getDaysOverdue(task.due_date)} ago
              </span>
            )}
          </div>
        ))}
        {rest > 0 && (
          <span className="text-xs text-[#FCA5A5]">+{rest} more</span>
        )}
      </div>
    </div>
  )
}
