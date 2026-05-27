'use client'

import { useState } from 'react'
import { BookOpen, Plus, Search, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { InboxItem } from '@/lib/types'

const TAG_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#0D9488']

function extractTags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) ?? []
  return matches.map(t => t.slice(1))
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/)
  return m ? m[0] : null
}

function stripMeta(text: string) {
  return text.replace(/^\[reference\]\s*/i, '').replace(/#\w+/g, '').replace(/https?:\/\/[^\s]+/g, '').trim()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props { refs: InboxItem[] }

export default function ReferencesClient({ refs: initial }: Props) {
  const [refs, setRefs]     = useState(initial)
  const [search, setSearch] = useState('')
  const [tag, setTag]       = useState<string | null>(null)
  const [input, setInput]   = useState('')
  const [saving, setSaving] = useState(false)

  // Collect all tags
  const allTags = Array.from(new Set(refs.flatMap(r => extractTags(r.raw_content))))

  const filtered = refs.filter(r => {
    const text = r.raw_content.toLowerCase()
    if (search && !text.includes(search.toLowerCase())) return false
    if (tag && !extractTags(r.raw_content).includes(tag)) return false
    return true
  })

  const handleSave = async () => {
    if (!input.trim() || saving) return
    setSaving(true)
    try {
      const { createInboxItem } = await import('@/lib/actions/inbox')
      const result = await createInboxItem(`[reference] ${input.trim()}`)
      if (result.data) setRefs(prev => [result.data!, ...prev])
      setInput('')
    } finally {
      setSaving(false)
    }
  }

  const handleDismiss = async (id: string) => {
    setRefs(prev => prev.filter(r => r.id !== id))
    const { dismissInboxItem } = await import('@/lib/actions/inbox')
    await dismissInboxItem(id)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-donna-text flex items-center gap-2">
          <BookOpen size={18} style={{ color: 'var(--c-violet)' }} />
          References
        </h1>
        <p className="text-sm text-donna-muted mt-0.5">
          Links, notes, and resources you want to keep. Add #tags to organise.
        </p>
      </div>

      {/* Add bar */}
      <div className="page-card flex items-center gap-3 px-4 py-3">
        <Plus size={15} className="text-donna-subtle shrink-0" />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Paste a link, write a note, or add #tags…"
          className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!input.trim() || saving}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-white
                     disabled:opacity-50 transition-all shrink-0"
          style={{ background: 'var(--c-violet)' }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
        </button>
      </div>

      {/* Search + tag filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="page-card flex items-center gap-2 px-3 py-2 flex-1 min-w-0">
          <Search size={14} className="text-donna-subtle shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search references…"
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.slice(0, 8).map((t, i) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors"
                style={tag === t
                  ? { background: TAG_COLORS[i % TAG_COLORS.length], color: '#fff' }
                  : { background: 'var(--c-elevated)', color: 'var(--c-muted)' }
                }
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="page-card py-16 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-donna-border" />
          <p className="text-sm text-donna-muted">
            {refs.length === 0
              ? 'No references saved yet. Paste a link or write a note above.'
              : 'No matches — try a different search or tag.'}
          </p>
        </div>
      ) : (
        <div className="page-card overflow-hidden divide-y divide-donna-border">
          {filtered.map(ref => {
            const url  = extractUrl(ref.raw_content)
            const body = stripMeta(ref.raw_content)
            const tags = extractTags(ref.raw_content)

            return (
              <div key={ref.id}
                className="group flex items-start gap-4 px-5 py-4 hover:bg-donna-elevated transition-colors">
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--c-violet-bg)' }}
                >
                  <BookOpen size={14} style={{ color: 'var(--c-violet)' }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-donna-text leading-snug">
                    {body || (url ? new URL(url).hostname : 'Reference')}
                  </p>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                      style={{ color: 'var(--c-violet)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={10} />
                      {new URL(url).hostname}
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {tags.map((t, i) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: TAG_COLORS[i % TAG_COLORS.length] + '18', color: TAG_COLORS[i % TAG_COLORS.length] }}
                      >
                        #{t}
                      </span>
                    ))}
                    <span className="text-[10px] text-donna-subtle">{fmtDate(ref.created_at)}</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDismiss(ref.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-donna-subtle
                             hover:text-[#EF4444] shrink-0 mt-1"
                  aria-label="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
