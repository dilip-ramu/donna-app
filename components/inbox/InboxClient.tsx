'use client'

import { useState } from 'react'
import { createInboxItem, dismissInboxItem } from '@/lib/actions/inbox'
import { useInbox } from '@/lib/hooks/useInbox'
import InboxCapture from './InboxCapture'
import InboxItemRow from './InboxItemRow'
import type { InboxItem } from '@/lib/types'

export default function InboxClient({
  initialItems,
  userId,
}: {
  initialItems: InboxItem[]
  userId: string
}) {
  const { items, optimisticCreate, removeOptimistic, removeItem } = useInbox(initialItems, userId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreate(content: string) {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    // Optimistic update
    const temp = optimisticCreate(content)

    const { error } = await createInboxItem(content)
    if (error) {
      removeOptimistic(temp.id)
      console.error('Failed to create inbox item:', error)
    }

    setIsSubmitting(false)
  }

  async function handleDismiss(id: string) {
    removeItem(id)
    await dismissInboxItem(id)
  }

  const unprocessed = items.filter(i => i.status === 'unprocessed' || i.status === 'processing')
  const processed   = items.filter(i => i.status === 'processed')
  const today       = processed.filter(i => i.created_at.startsWith(new Date().toISOString().split('T')[0]))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-donna-text mb-1">Inbox</h1>
        <p className="text-donna-muted text-sm">Capture anything. Donna handles the rest.</p>
      </div>

      <InboxCapture onSubmit={handleCreate} isSubmitting={isSubmitting} />

      {/* Unprocessed */}
      {unprocessed.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-donna-muted mb-3 font-medium">
            Processing · {unprocessed.length}
          </h2>
          <div className="space-y-1">
            {unprocessed.map(item => (
              <InboxItemRow key={item.id} item={item} onDismiss={handleDismiss} />
            ))}
          </div>
        </section>
      )}

      {/* Processed today */}
      {today.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-donna-muted mb-3 font-medium">
            Processed Today
          </h2>
          <div className="space-y-1">
            {today.map(item => (
              <InboxItemRow key={item.id} item={item} onDismiss={handleDismiss} />
            ))}
          </div>
        </section>
      )}

      {/* Empty */}
      {items.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-donna-muted text-sm">All clear. Donna is listening.</p>
        </div>
      )}
    </div>
  )
}
