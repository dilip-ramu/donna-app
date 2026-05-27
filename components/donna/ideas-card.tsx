'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lightbulb, Plus, ChevronRight, Loader2, Check } from 'lucide-react'
import { Idea } from '@/lib/types'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  raw:       { label: 'Raw',       bg: '#FFF7ED', color: '#F97316' },
  refined:   { label: 'Refined',   bg: '#EFF6FF', color: '#3B82F6' },
  validated: { label: 'Validated', bg: '#ECFDF5', color: '#10B981' },
  shelved:   { label: 'Shelved',   bg: '#F9FAFB', color: '#9CA3AF' },
  building:  { label: 'Building',  bg: '#F5F3FF', color: '#7C3AED' },
  shipped:   { label: 'Shipped',   bg: '#F0FDF4', color: '#16A34A' },
}

const POTENTIAL_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: '⭐ High',  color: '#F59E0B' },
  medium: { label: 'Medium',  color: '#3B82F6' },
  low:    { label: 'Low',     color: '#9CA3AF' },
}

interface IdeasCardProps {
  ideas: Idea[]
}

export default function IdeasCard({ ideas }: IdeasCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle')

  const handleSave = async () => {
    if (!value.trim() || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const { createInboxItem } = await import('@/lib/actions/inbox')
      await createInboxItem(`[idea] ${value.trim()}`)
      setValue('')
      setSaveState('done')
      setTimeout(() => { setSaveState('idle'); setIsAdding(false) }, 1500)
    } catch {
      setSaveState('idle')
    }
  }

  const openAdd = () => {
    setIsAdding(true)
  }

  return (
    <DashboardCard>
      <CardBody>
        <CardHeader
          title="Ideas"
          right={
            <button
              onClick={openAdd}
              className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
            >
              <Plus size={12} /> Capture
            </button>
          }
        />

        {/* Inline capture form */}
        {isAdding && (
          <div
            className="mb-3 rounded-xl p-3 shrink-0"
            style={{
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.05)',
            }}
          >
            <textarea
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
                if (e.key === 'Escape') { setIsAdding(false); setValue('') }
              }}
              placeholder="What's the idea? ↵ to save"
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-[#111827]
                         placeholder:text-[#9CA3AF] outline-none leading-snug"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setIsAdding(false); setValue('') }}
                className="text-xs text-[#9CA3AF] hover:text-[#6B7280] px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!value.trim() || saveState !== 'idle'}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg
                           text-white disabled:opacity-50 transition-all"
                style={{ background: '#F59E0B' }}
              >
                {saveState === 'saving'
                  ? <Loader2 size={11} className="animate-spin" />
                  : saveState === 'done'
                  ? <><Check size={11} /> Saved</>
                  : 'Capture'}
              </button>
            </div>
          </div>
        )}

        <CardList>
          {ideas.length === 0 && !isAdding ? (
            <div className="py-8 text-center">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: '#FFFBEB' }}
              >
                <Lightbulb size={18} style={{ color: '#F59E0B' }} />
              </div>
              <p className="text-sm text-[#9CA3AF]">No ideas yet.</p>
              <button
                onClick={openAdd}
                className="text-xs text-[#7C3AED] hover:underline mt-1"
              >
                Capture your first idea →
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {ideas.map(idea => {
                const status = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.raw
                const potential = idea.potential ? POTENTIAL_CONFIG[idea.potential] : null

                return (
                  <li
                    key={idea.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors
                               hover:bg-[#FFFBEB] cursor-default"
                    style={{ background: '#FAFAFA' }}
                  >
                    <Lightbulb
                      size={13}
                      className="mt-0.5 shrink-0"
                      style={{ color: '#F59E0B' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827] leading-snug truncate">
                        {idea.title}
                      </p>
                      {idea.description && (
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 line-clamp-1">
                          {idea.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                        {potential && (
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: potential.color }}
                          >
                            {potential.label}
                          </span>
                        )}
                        {idea.idea_type && idea.idea_type !== 'general' && (
                          <span className="text-[10px] text-[#C4C4CC] capitalize">
                            {idea.idea_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/ideas"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            All ideas <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
