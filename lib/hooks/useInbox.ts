'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InboxItem } from '@/lib/types'

export function useInbox(initialItems: InboxItem[] = [], userId?: string) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [isCreating, setIsCreating] = useState(false)

  // Realtime subscription — set up synchronously once userId is known
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`inbox_realtime_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as InboxItem
            // Skip if it's already in the list (e.g. optimistic insert)
            setItems(prev =>
              prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev =>
              prev.map(item =>
                item.id === payload.new.id ? { ...item, ...payload.new as InboxItem } : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const optimisticCreate = useCallback((content: string): InboxItem => {
    const optimistic: InboxItem = {
      id: `optimistic-${Date.now()}`,
      user_id: '',
      raw_content: content,
      source: 'manual',
      status: 'unprocessed',
      processed_at: null,
      promoted_to: null,
      promoted_id: null,
      ai_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    setItems(prev => [optimistic, ...prev])
    return optimistic
  }, [])

  const removeOptimistic = useCallback((tempId: string) => {
    setItems(prev => prev.filter(item => item.id !== tempId))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  return { items, isCreating, setIsCreating, optimisticCreate, removeOptimistic, removeItem }
}
