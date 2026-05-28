'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookMarked, Plus, Search, Trash2, Loader2, Check, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { InboxItem } from '@/lib/types'

const BORDER_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

function groupByDate(notes: InboxItem[]): { label: string; items: InboxItem[] }[] {
  const groups: Record<string, InboxItem[]> = {}
  const now = new Date()

  for (const note of notes) {
    const d = new Date(note.created_at)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    let label: string
    if (diffDays === 0) label = 'Today'
    else if (diffDays === 1) label = 'Yesterday'
    else if (diffDays < 7) label = 'This week'
    else if (diffDays < 30) label = 'This month'
    else label = d.toLocaleDateString([], { month: 'long', year: 'numeric' })

    if (!groups[label]) groups[label] = []
    groups[label].push(note)
  }

  const ORDER = ['Today', 'Yesterday', 'This week', 'This month']
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return b.localeCompare(a)
    })
    .map(([label, items]) => ({ label, items }))
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MemoryPageClient() {
  const [notes, setNotes]     = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [input, setInput]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .ilike('raw_content', '[memory]%')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) console.error('[memory-page] fetch error:', error)
      setNotes((data ?? []) as InboxItem[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const filtered = search
    ? notes.filter(n => n.raw_content.toLowerCase().includes(search.toLowerCase()))
    : notes

  const groups = groupByDate(filtered)

  const handleSave = async () => {
    if (!input.trim() || saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('inbox_items')
        .insert({
          user_id: user.id,
          raw_content: `[memory] ${input.trim()}`,
          source: 'manual',
          status: 'unprocessed',
        })

      if (!error) {
        setInput('')
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        await fetchNotes()   // refresh list
      }
    } finally {
      setSaving(false)
    }
  }

  const handleForget = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    const supabase = createClient()
    await supabase
      .from('inbox_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-donna-text flex items-center gap-2">
            <BookMarked size={18} style={{ color: 'var(--c-violet)' }} />
            Memory
          </h1>
          <p className="text-sm text-donna-muted mt-0.5">
            {loading ? 'Loading…' : `${notes.length} thing${notes.length !== 1 ? 's' : ''} remembered`}
          </p>
        </div>
        <button
          onClick={fetchNotes}
          className="flex items-center gap-1.5 text-xs text-donna-muted hover:text-donna-text transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Add + Search row */}
      <div className="flex gap-3">
        <div className="flex-1 page-card flex items-center gap-2 px-4 py-3">
          <Plus size={15} className="text-donna-subtle shrink-0" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="What do you want to remember?"
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!input.trim() || saving}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-white
                       disabled:opacity-50 transition-all shrink-0"
            style={{ background: 'var(--c-violet)' }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" />
              : saved ? <><Check size={11} /> Saved</>
              : 'Remember'}
          </button>
        </div>

        <div className="page-card flex items-center gap-2 px-3 py-3">
          <Search size={14} className="text-donna-subtle shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-32 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      {loading ? (
        <div className="page-card py-16 text-center">
          <Loader2 size={24} className="mx-auto mb-3 text-donna-border animate-spin" />
          <p className="text-sm text-donna-muted">Loading your memories…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="page-card py-16 text-center">
          <BookMarked size={32} className="mx-auto mb-3 text-donna-border" />
          <p className="text-sm text-donna-muted">
            {search ? 'No memories match your search.' : 'Nothing in memory yet. Tell Donna things to remember.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-donna-subtle uppercase tracking-wider mb-2 px-1">
                {label}
              </p>
              <div className="page-card overflow-hidden divide-y divide-donna-border">
                {items.map((note, i) => (
                  <div
                    key={note.id}
                    className="group flex items-start hover:bg-donna-elevated transition-colors"
                    style={{ borderLeft: `3px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}` }}
                  >
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <p className="text-sm text-donna-text leading-relaxed">
                        {note.raw_content.replace(/^\[memory\]\s*/i, '')}
                      </p>
                      <p className="text-[10px] text-donna-subtle mt-1">{fmtTime(note.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleForget(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-3 text-donna-subtle
                                 hover:text-[#EF4444] shrink-0"
                      aria-label="Forget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
