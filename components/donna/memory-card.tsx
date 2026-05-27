'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Check, Loader2 } from 'lucide-react'
import { InboxItem } from '@/lib/types'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'
import { BORDER_COLORS } from '@/lib/donna-theme'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

interface MemoryCardProps {
  notes: InboxItem[]
}

export default function MemoryCard({ notes }: MemoryCardProps) {
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

  const openAdd = () => {
    setIsAdding(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <DashboardCard>
      <CardBody>
        <CardHeader
          title="Memory"
          right={
            <button
              onClick={openAdd}
              className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
            >
              <Plus size={12} /> Add
            </button>
          }
        />

        {/* Add form */}
        {isAdding && (
          <div className="mb-3 rounded-xl border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.05)] p-3 shrink-0">
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
              className="w-full resize-none bg-transparent text-sm text-[#111827]
                         placeholder:text-[#9CA3AF] outline-none leading-snug"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setIsAdding(false); setValue('') }}
                className="text-xs text-[#9CA3AF] hover:text-[#6B7280] px-2 py-1"
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

        <CardList>
          {notes.length === 0 && !isAdding ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#6B7280]">Nothing in memory yet.</p>
              <button
                onClick={openAdd}
                className="text-xs text-[#7C3AED] hover:underline mt-1"
              >
                Add your first memory →
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {notes.map((note, i) => (
                <li
                  key={note.id}
                  className="flex items-center gap-3 py-2 rounded-lg overflow-hidden"
                  style={{
                    borderLeft: `3px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}`,
                    paddingLeft: 12,
                    background: '#FAFAFA',
                  }}
                >
                  <p className="flex-1 text-sm text-[#111827] leading-snug line-clamp-1 min-w-0">
                    {note.raw_content.replace(/^\[memory\]\s*/i, '')}
                  </p>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0">
                    {formatDate(note.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/memory"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            View all memories <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
