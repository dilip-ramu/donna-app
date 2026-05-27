'use client'

import { useState, useRef } from 'react'
import { Plus, ChevronRight, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { InboxItem } from '@/lib/types'

// Rotating border colours for memory notes
const BORDER_COLORS = ['#F59E0B', '#3B82F6', '#F97316', '#8B5CF6', '#10B981', '#EF4444']

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

interface MemoryDashWidgetProps {
  notes: InboxItem[]
}

export default function MemoryDashWidget({ notes }: MemoryDashWidgetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    if (!value.trim() || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const { createInboxItem } = await import('@/lib/actions/inbox')
      await createInboxItem(`[memory] ${value.trim()}`)
      setValue('')
      setSaveState('done')
      setTimeout(() => { setSaveState('idle'); setIsAdding(false) }, 1500)
    } catch {
      setSaveState('idle')
    }
  }

  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-donna-text">Memory</h2>
        <button
          onClick={() => { setIsAdding(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
          className="flex items-center gap-1 text-xs font-medium text-donna-violet hover:underline"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="mb-3 rounded-xl border border-donna-violet/30 bg-donna-violet/5 p-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
              if (e.key === 'Escape') { setIsAdding(false); setValue('') }
            }}
            placeholder="Write something to remember… ↵ save"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-donna-text
                       placeholder:text-donna-muted outline-none leading-snug"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setIsAdding(false); setValue('') }}
              className="text-xs text-donna-muted hover:text-donna-text px-2 py-1"
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={!value.trim() || saveState !== 'idle'}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg
                         text-white disabled:opacity-50 transition-all"
              style={{ background: '#7C3AED' }}
            >
              {saveState === 'saving' ? <Loader2 size={11} className="animate-spin" />
                : saveState === 'done' ? <><Check size={11} /> Saved</>
                : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
      {notes.length === 0 && !isAdding ? (
        <div className="py-4 text-center">
          <p className="text-sm text-donna-muted">Nothing in memory yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((note, i) => (
            <li key={note.id}
              className="flex items-center gap-3 py-2 rounded-lg overflow-hidden"
              style={{ borderLeft: `3px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}`, paddingLeft: 12, background: '#FAFAFA' }}>
              <p className="flex-1 text-sm text-donna-text leading-snug line-clamp-1 min-w-0">
                {note.raw_content.replace(/^\[memory\]\s*/i, '')}
              </p>
              <span className="text-[10px] text-donna-muted shrink-0">
                {formatDate(note.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      </div>

      <Link
        href="/memory"
        className="flex items-center gap-1 mt-3 text-xs font-medium text-donna-violet hover:underline"
      >
        View all memories <ChevronRight size={12} />
      </Link>
    </div>
  )
}
