'use client'

import { X, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatRelative } from '@/lib/utils/date'
import type { InboxItem } from '@/lib/types'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  task:     { label: 'Task',     color: 'text-blue-400 bg-blue-400/10' },
  idea:     { label: 'Idea',     color: 'text-purple-400 bg-purple-400/10' },
  meeting:  { label: 'Meeting',  color: 'text-teal-400 bg-teal-400/10' },
  note:     { label: 'Note',     color: 'text-donna-muted bg-donna-subtle' },
  reminder: { label: 'Reminder', color: 'text-donna-gold bg-donna-gold/10' },
}

export default function InboxItemRow({
  item,
  onDismiss,
}: {
  item: InboxItem
  onDismiss: (id: string) => void
}) {
  const isProcessing = item.status === 'processing' || item.id.startsWith('optimistic-')
  const category = item.ai_metadata?.category
  const categoryConfig = category ? CATEGORY_LABELS[category] : null

  const promotedHref = item.promoted_to === 'task'
    ? `/tasks`
    : item.promoted_to === 'idea'
    ? `/ideas`
    : null

  return (
    <div className={cn(
      'group flex items-start gap-3 p-3 rounded-lg transition-colors',
      'hover:bg-donna-elevated border border-transparent hover:border-donna-border',
      isProcessing && 'opacity-70'
    )}>
      {/* Processing indicator */}
      <div className="shrink-0 mt-0.5">
        {isProcessing ? (
          <Loader2 size={14} className="text-donna-gold animate-spin" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border border-donna-border mt-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-donna-text leading-relaxed">{item.raw_content}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-donna-muted">
            {formatRelative(item.created_at)}
          </span>

          {isProcessing && (
            <span className="text-xs text-donna-muted italic">Donna is thinking...</span>
          )}

          {categoryConfig && !isProcessing && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', categoryConfig.color)}>
              {categoryConfig.label}
            </span>
          )}

          {item.promoted_to && promotedHref && (
            <Link
              href={promotedHref}
              className="flex items-center gap-1 text-xs text-donna-gold hover:underline"
            >
              <ArrowRight size={10} />
              Added to {item.promoted_to}
            </Link>
          )}
        </div>
      </div>

      {/* Dismiss */}
      {!isProcessing && (
        <button
          onClick={() => onDismiss(item.id)}
          className="shrink-0 p-1 rounded text-donna-muted hover:text-donna-text
                     opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
