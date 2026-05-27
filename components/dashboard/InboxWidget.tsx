'use client'

import { useState } from 'react'
import { X, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { InboxItem } from '@/lib/types'
import { dismissInboxItem } from '@/lib/actions/inbox'
import { cn } from '@/lib/utils/cn'

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  task:    { bg: '#EDE9FD', color: '#7C3AED' },
  idea:    { bg: '#FEF3C7', color: '#D97706' },
  note:    { bg: '#ECFDF5', color: '#059669' },
  memory:  { bg: '#FFF0F3', color: '#F43F5E' },
  event:   { bg: '#EFF6FF', color: '#2563EB' },
  meeting: { bg: '#FDF4FF', color: '#A21CAF' },
  reminder:{ bg: '#FFF7ED', color: '#EA580C' },
}

const DEFAULT_CAT = { bg: '#EDE8F8', color: '#8878B8' }

interface InboxWidgetProps {
  items: InboxItem[]
  totalCount: number
}

export default function InboxWidget({ items, totalCount }: InboxWidgetProps) {
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set())

  const visible = items.filter(i => !localDismissed.has(i.id)).slice(0, 4)
  const displayCount = Math.max(0, totalCount - localDismissed.size)

  const handleDismiss = async (id: string) => {
    setDismissing(id)
    setLocalDismissed(prev => new Set([...prev, id]))
    await dismissInboxItem(id)
    setDismissing(null)
  }

  return (
    <div className="donna-card overflow-hidden">
      {/* Teal accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0D9488, #2DD4BF)' }} />
      <div className="p-4">
      <div className="widget-header">
        <h2 className="text-sm font-semibold text-donna-text flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-donna-teal inline-block" />
          Inbox
        </h2>
        <Link href="/inbox" className="text-xs text-donna-muted hover:text-donna-gold flex items-center gap-0.5 transition-colors">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Big count */}
      <div className="mb-4 pb-4 border-b border-donna-border">
        <p className="text-3xl font-semibold text-donna-text leading-none">{displayCount}</p>
        <p className="text-xs text-donna-muted mt-1">
          {displayCount === 0 ? 'inbox zero — nice work' : displayCount === 1 ? 'item to review' : 'items to review'}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-xs text-donna-muted">All clear.</p>
        </div>
      ) : (
        <ul className="divide-y divide-donna-border">
          {visible.map(item => {
            const cat = item.ai_metadata?.category
            const style = cat ? (CATEGORY_STYLES[cat] ?? DEFAULT_CAT) : DEFAULT_CAT
            const isLoading = dismissing === item.id

            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-start gap-2.5 py-2.5 group',
                  isLoading && 'opacity-40'
                )}
              >
                {cat && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0 uppercase tracking-wide"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {cat}
                  </span>
                )}
                <p className="flex-1 text-xs text-donna-text leading-snug line-clamp-2">
                  {item.raw_content}
                </p>
                <button
                  onClick={() => handleDismiss(item.id)}
                  disabled={isLoading}
                  className="shrink-0 p-1 text-donna-muted hover:text-donna-text hover:bg-donna-elevated
                             rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  {isLoading
                    ? <Loader2 size={11} className="animate-spin" />
                    : <X size={11} />
                  }
                </button>
              </li>
            )
          })}
        </ul>
      )}
      </div>
    </div>
  )
}
