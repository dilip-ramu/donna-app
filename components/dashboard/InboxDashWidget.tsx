'use client'

import { useState } from 'react'
import { Mail, FileText, MessageSquare, BellRing, Receipt, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { InboxItem } from '@/lib/types'
import { dismissInboxItem } from '@/lib/actions/inbox'

// Pick an icon based on guessed content type
function guessIcon(content: string) {
  const lower = content.toLowerCase()
  if (lower.includes('email') || lower.includes('mail') || lower.includes('gmail')) return Mail
  if (lower.includes('document') || lower.includes('doc') || lower.includes('report') || lower.includes('pdf')) return FileText
  if (lower.includes('meeting') || lower.includes('notes') || lower.includes('call')) return MessageSquare
  if (lower.includes('alert') || lower.includes('reminder') || lower.includes('renew')) return BellRing
  if (lower.includes('invoice') || lower.includes('payment') || lower.includes('bank')) return Receipt
  return Mail
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface InboxDashWidgetProps {
  items: InboxItem[]
  totalCount: number
}

export default function InboxDashWidget({ items, totalCount }: InboxDashWidgetProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = items.filter(i => !dismissed.has(i.id)).slice(0, 5)
  const count = Math.max(0, totalCount - dismissed.size)

  const handleDismiss = async (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    await dismissInboxItem(id)
  }

  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-donna-text">Inbox</h2>
        {count > 0 && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-white"
            style={{ background: '#7C3AED' }}>
            {count}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {visible.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-donna-muted">
            {count === 0 ? 'Inbox zero — nice work.' : 'Loading…'}
          </p>
        </div>
      ) : (
        <ul className="space-y-0">
          {visible.map(item => {
            const Icon = guessIcon(item.raw_content)
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 py-2.5 border-b border-donna-border last:border-0
                           group cursor-pointer hover:bg-donna-elevated -mx-5 px-5 transition-colors"
                onClick={() => handleDismiss(item.id)}
              >
                <Icon size={14} className="text-donna-muted shrink-0" strokeWidth={1.8} />
                <p className="flex-1 text-sm text-donna-text leading-snug truncate min-w-0">
                  {item.raw_content}
                </p>
                <span className="text-[10px] text-donna-muted shrink-0">
                  {formatTime(item.created_at)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      <Link
        href="/inbox"
        className="flex items-center gap-1 mt-3 text-xs font-medium text-donna-violet hover:underline"
      >
        Open inbox <ChevronRight size={12} />
      </Link>
    </div>
  )
}
