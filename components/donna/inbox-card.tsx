'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, FileText, MessageSquare, BellRing, Receipt, ChevronRight, X } from 'lucide-react'
import { InboxItem } from '@/lib/types'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'

function guessIcon(content: string) {
  const c = content.toLowerCase()
  if (c.includes('email') || c.includes('@') || c.includes('gmail')) return Mail
  if (c.includes('receipt') || c.includes('invoice') || c.includes('payment')) return Receipt
  if (c.includes('message') || c.includes('sms') || c.includes('slack')) return MessageSquare
  if (c.includes('remind') || c.includes('alert') || c.includes('notification')) return BellRing
  return FileText
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

interface InboxCardProps {
  items: InboxItem[]
  totalCount: number
}

export default function InboxCard({ items, totalCount }: InboxCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = items.filter(i => !dismissed.has(i.id))

  const handleDismiss = async (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    try {
      const { dismissInboxItem } = await import('@/lib/actions/inbox')
      await dismissInboxItem(id)
    } catch { /* silent */ }
  }

  return (
    <DashboardCard>
      <CardBody>
        <CardHeader
          title="Inbox"
          right={
            totalCount > 0 && (
              <span
                className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
                style={{ background: '#7C3AED', minWidth: 18, textAlign: 'center', display: 'inline-block' }}
              >
                {totalCount}
              </span>
            )
          }
        />

        <CardList>
          {visible.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-donna-muted">Inbox is clear.</p>
              <p className="text-[11px] text-donna-subtle mt-1">Nice work.</p>
            </div>
          ) : (
            <ul>
              {visible.map(item => {
                const Icon = guessIcon(item.raw_content)
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-2.5 border-b border-donna-border last:border-0 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-donna-elevated flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={13} className="text-donna-muted" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-donna-text leading-snug line-clamp-2">
                        {item.raw_content}
                      </p>
                      <p className="text-[11px] text-donna-subtle mt-0.5">{formatTime(item.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="text-donna-subtle hover:text-donna-muted opacity-0 group-hover:opacity-100
                                 transition-all shrink-0 mt-0.5"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/inbox"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            Open inbox <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
