'use client'

import { useState, useRef } from 'react'
import { Brain, Plus, Loader2, Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

async function saveMemoryNote(content: string): Promise<void> {
  const { createInboxItem } = await import('@/lib/actions/inbox')
  await createInboxItem(`[memory] ${content}`)
}

interface MemoryNote {
  id: string
  content: string
  created_at: string
}

interface MemoryWidgetProps {
  recentNotes?: MemoryNote[]
}

export default function MemoryWidget({ recentNotes = [] }: MemoryWidgetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    if (!value.trim() || state !== 'idle') return
    setState('saving')
    await saveMemoryNote(value.trim())
    setValue('')
    setState('saved')
    setTimeout(() => {
      setState('idle')
      setIsAdding(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setIsAdding(false); setValue('') }
  }

  const openAdd = () => {
    setIsAdding(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <div className="donna-card overflow-hidden">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #D97706, #F59E0B)' }} />
      <div className="p-4">
      <div className="widget-header">
        <div className="flex items-center gap-1.5">
          <Brain size={13} style={{ color: '#D97706' }} />
          <h2 className="text-sm font-semibold text-donna-text">Memory</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openAdd}
            className="flex items-center gap-1 text-xs text-donna-muted hover:text-donna-gold transition-colors"
          >
            <Plus size={12} /> add
          </button>
          <Link href="/documents" className="text-donna-muted hover:text-donna-gold transition-colors">
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {isAdding && (
        <div className={cn(
          'mb-3 rounded-lg px-3 py-2.5 border transition-all',
          'border-donna-gold/40 ring-2 ring-donna-gold/15 bg-donna-bg'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write something to remember… ↵ save, Esc cancel"
            rows={2}
            className="w-full resize-none bg-transparent text-xs text-donna-text
                       placeholder:text-donna-muted outline-none leading-snug"
          />
          <div className="flex justify-end gap-1.5 mt-1.5">
            <button onClick={() => { setIsAdding(false); setValue('') }}
              className="text-[11px] text-donna-muted hover:text-donna-text px-2 py-0.5 rounded">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!value.trim() || state !== 'idle'}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1',
                value.trim() && state === 'idle' ? 'bg-donna-gold text-white hover:bg-donna-gold/90'
                  : state === 'saved' ? 'bg-green-500 text-white'
                  : 'bg-donna-elevated text-donna-muted'
              )}>
              {state === 'saving' ? <Loader2 size={11} className="animate-spin" />
                : state === 'saved' ? <><Check size={11} /> Saved</>
                : 'Save'}
            </button>
          </div>
        </div>
      )}

      {recentNotes.length === 0 && !isAdding ? (
        <div className="py-4 text-center">
          <p className="text-xs text-donna-muted mb-2">Nothing in memory yet.</p>
          <button onClick={openAdd} className="text-xs text-donna-gold hover:underline">
            Add something to remember →
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {recentNotes.slice(0, 4).map(note => (
            <li key={note.id}
              className="text-xs text-donna-text leading-snug px-3 py-2 rounded-lg bg-amber-50"
              style={{ borderLeft: '3px solid #D97706' }}>
              {note.content}
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
