'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles, Send, Plus, Check, Loader2, Trash2,
  MessageSquare, BookMarked, Inbox,
  CheckSquare, Brain, CalendarDays, PenLine, X, Landmark, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { InboxItem } from '@/lib/types'
import { BORDER_COLORS } from '@/lib/donna-theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'memory' | 'inbox'

type ChatMode = 'tasks' | 'memory' | 'calendar' | 'draft' | 'finance'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
  ts: Date
}

interface RightPanelProps {
  userId: string
  memoryNotes: InboxItem[]
  inboxItems: InboxItem[]
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES: {
  id: ChatMode
  icon: typeof CheckSquare
  label: string
  description: string
  placeholder: string
  color: string
  bg: string
  activeBg: string
  systemHint: string
}[] = [
  {
    id: 'tasks',
    icon: CheckSquare,
    label: 'Tasks',
    description: 'Add or manage tasks',
    placeholder: 'Add a task, ask about priorities…',
    color: '#7C3AED',
    bg: '#F5F3FF',
    activeBg: 'rgba(124,58,237,0.08)',
    systemHint: 'The user wants help with tasks — adding, completing, or reviewing their task list.',
  },
  {
    id: 'memory',
    icon: Brain,
    label: 'Memory',
    description: 'Capture a thought',
    placeholder: 'Tell me something to remember…',
    color: '#3B82F6',
    bg: '#EFF6FF',
    activeBg: 'rgba(59,130,246,0.08)',
    systemHint: 'The user wants to capture or retrieve a memory or note.',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    label: 'Calendar',
    description: 'Schedule or check events',
    placeholder: 'What do you want to schedule?',
    color: '#10B981',
    bg: '#ECFDF5',
    activeBg: 'rgba(16,185,129,0.08)',
    systemHint: 'The user wants help with their calendar — scheduling, checking upcoming events, or meeting prep.',
  },
  {
    id: 'draft',
    icon: PenLine,
    label: 'Draft',
    description: 'Write with Donna',
    placeholder: 'What would you like to write?',
    color: '#F59E0B',
    bg: '#FFFBEB',
    activeBg: 'rgba(245,158,11,0.08)',
    systemHint: 'The user wants help drafting or writing something — email, message, document, or any other text.',
  },
  {
    id: 'finance',
    icon: Landmark,
    label: 'Finance',
    description: 'Log expenses · check balances',
    placeholder: 'Log ₹500 dinner from HDFC Savings…',
    color: '#10B981',
    bg: '#ECFDF5',
    activeBg: 'rgba(16,185,129,0.08)',
    systemHint: 'The user wants to log a financial transaction or query their finance data in Vaultr.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

/** Render assistant message — handles [text](url) links and **bold** inline */
function renderMessage(content: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Split on markdown links [label](url)
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0, m: RegExpExecArray | null

  while ((m = linkRe.exec(content)) !== null) {
    if (m.index > last) parts.push(renderBold(content.slice(last, m.index), parts.length + 'pre'))
    parts.push(
      <a
        key={m.index}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline text-[#7C3AED] hover:opacity-80"
      >
        {m[1]} <ExternalLink size={10} />
      </a>
    )
    last = m.index + m[0].length
  }
  if (last < content.length) parts.push(renderBold(content.slice(last), 'tail'))
  return <span className="whitespace-pre-wrap">{parts}</span>
}

function renderBold(text: string, key: string | number): React.ReactNode {
  const boldRe = /\*\*([^*]+)\*\*/g
  const parts: React.ReactNode[] = []
  let last = 0, m: RegExpExecArray | null
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<strong key={m.index}>{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span key={key}>{parts}</span>
}

function formatNoteDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

/**
 * Parses an optional date in DD/MM, DD/MM/YY, or DD/MM/YYYY format from
 * free-form task text.  Returns the cleaned title and an ISO due_date string.
 *
 * Examples:
 *   "Call John 25/06"         → { title: "Call John",   dueDate: "2025-06-25" }
 *   "Submit report 15/07/25"  → { title: "Submit report", dueDate: "2025-07-15" }
 *   "Buy milk"                → { title: "Buy milk",    dueDate: null }
 */
function parseDateFromText(text: string): { title: string; dueDate: string | null } {
  // Matches DD/MM, DD/MM/YY, or DD/MM/YYYY anywhere in the string
  const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/

  const match = text.match(DATE_RE)
  if (!match) return { title: text.trim(), dueDate: null }

  const day   = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)

  // Resolve year
  let year: number
  if (match[3]) {
    const raw = parseInt(match[3], 10)
    year = raw < 100 ? 2000 + raw : raw
  } else {
    // No year supplied — use current year; bump to next year if already past
    const now = new Date()
    year = now.getFullYear()
    const candidate = new Date(year, month - 1, day)
    // If the date is in the past (more than 1 day ago), assume next year
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (candidate < yesterday) year += 1
  }

  // Validate: constructing Date with wrong month rolls over, so check it back
  const d = new Date(year, month - 1, day)
  if (d.getMonth() !== month - 1 || d.getDate() !== day) {
    // Invalid date (e.g. 31/02) — treat as no date
    return { title: text.trim(), dueDate: null }
  }

  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Strip the matched date token (and any surrounding whitespace) from the title
  const title = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim() || text.trim()

  return { title, dueDate }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function ChatTab({ userId }: { userId: string }) {
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [input, setInput]           = useState('')
  const [activeMode, setActiveMode] = useState<ChatMode | null>(null)
  const [isBusy, setIsBusy]         = useState(false)
  const inputRef       = useRef<HTMLInputElement>(null)
  const scrollRef      = useRef<HTMLDivElement>(null)
  const streamingIdRef = useRef<string | null>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when a mode is selected
  const selectMode = (mode: ChatMode) => {
    setActiveMode(prev => prev === mode ? null : mode)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Direct-action modes (Tasks / Memory / Calendar) ──────────────────────
  const handleActionMode = async (content: string, mode: ChatMode) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode, ts: new Date() }
    const respId = uid()
    const pendingMsg: ChatMessage = { id: respId, role: 'assistant', content: '', ts: new Date() }
    setMessages(prev => [...prev, userMsg, pendingMsg])
    setIsBusy(true)

    try {
      let reply = ''

      if (mode === 'tasks') {
        const { title, dueDate } = parseDateFromText(content)
        const { createTask } = await import('@/lib/actions/tasks')
        const result = await createTask({
          title,
          status: 'active',
          priority: 'medium',
          ...(dueDate ? { due_date: dueDate } : {}),
        })

        if (result.error) {
          reply = `Couldn't add that task. ${result.error}`
        } else if (dueDate) {
          // Format the due date in a human-readable way for the confirmation
          const due = new Date(dueDate + 'T12:00:00')
          const todayStr = new Date().toISOString().split('T')[0]
          const dueLabel = dueDate === todayStr
            ? 'due today'
            : `due ${due.toLocaleDateString([], { day: 'numeric', month: 'short', year: due.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}`
          reply = `✓ Task added — "${title}" · ${dueLabel}`
        } else {
          reply = `✓ Task added — "${title}"`
        }

      } else if (mode === 'memory') {
        const { createInboxItem } = await import('@/lib/actions/inbox')
        const result = await createInboxItem(`[memory] ${content}`)
        reply = result.error
          ? `Couldn't save that. ${result.error}`
          : `✓ Remembered — "${content}"`

      } else if (mode === 'calendar') {
        const { createInboxItem } = await import('@/lib/actions/inbox')
        const result = await createInboxItem(`[calendar] ${content}`)
        reply = result.error
          ? `Couldn't capture that. ${result.error}`
          : `📅 Captured for your calendar — "${content}"\nI'll process the details and add it to your schedule.`
      }

      setMessages(prev => prev.map(m => m.id === respId ? { ...m, content: reply } : m))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === respId ? { ...m, content: 'Something went wrong. Please try again.' } : m
      ))
    } finally {
      setIsBusy(false)
      inputRef.current?.focus()
    }
  }

  // ── Finance mode — calls Donna's finance action API ──────────────────────
  const handleFinanceMode = async (content: string) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode: 'finance', ts: new Date() }
    const respId = uid()
    const pendingMsg: ChatMessage = { id: respId, role: 'assistant', content: '', ts: new Date() }
    setMessages(prev => [...prev, userMsg, pendingMsg])
    setIsBusy(true)

    try {
      const res = await fetch('/api/finance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })

      const json = await res.json() as {
        result?: { status: string; message: string; redirectUrl?: string }
        error?: string
      }

      if (!res.ok || json.error) {
        setMessages(prev => prev.map(m =>
          m.id === respId ? { ...m, content: json.error ?? 'Finance action failed.' } : m
        ))
        return
      }

      const result = json.result!
      let reply = result.message

      // Append a clickable link for redirect results
      if (result.status === 'redirect' && result.redirectUrl) {
        reply += `\n\n[Open in Vaultr →](${result.redirectUrl})`
      }

      setMessages(prev => prev.map(m => m.id === respId ? { ...m, content: reply } : m))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === respId ? { ...m, content: 'Could not reach Vaultr. Check your connection.' } : m
      ))
    } finally {
      setIsBusy(false)
      inputRef.current?.focus()
    }
  }

  // ── AI chat (Draft mode or no mode) ──────────────────────────────────────
  const handleChat = async (content: string, mode: ChatMode | null) => {
    const modeConfig = mode ? MODES.find(m => m.id === mode) : null
    const fullContent = modeConfig
      ? `[Context: ${modeConfig.systemHint}]\n\n${content}`
      : content

    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode: mode ?? undefined, ts: new Date() }
    const assistantId = uid()
    streamingIdRef.current = assistantId
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', ts: new Date() }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: fullContent }], userId }),
      })

      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        const lines = decoder.decode(chunk, { stream: true }).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) accumulated += parsed.text
          } catch { /* skip */ }
        }
        const id = streamingIdRef.current
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: accumulated } : m))
      }
    } catch {
      const id = streamingIdRef.current
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, content: "I'm having trouble connecting. Please try again." } : m
      ))
    } finally {
      setIsBusy(false)
      inputRef.current?.focus()
    }
  }

  // ── Unified send handler ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || isBusy) return
    setInput('')

    // Action modes → direct DB writes, instant confirmation
    if (activeMode === 'tasks' || activeMode === 'memory' || activeMode === 'calendar') {
      await handleActionMode(content, activeMode)
    } else if (activeMode === 'finance') {
      // Finance mode → Vaultr integration API
      await handleFinanceMode(content)
    } else {
      // Draft mode or no mode → stream AI response
      await handleChat(content, activeMode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, userId, isBusy, activeMode])

  const activeCfg = MODES.find(m => m.id === activeMode)

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Message history ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-2 space-y-3">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(147,51,234,0.1))' }}
            >
              <Sparkles size={18} className="text-[#7C3AED]" />
            </div>
            <p className="text-sm text-[#374151] font-medium">What can I help with?</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">
              Pick a mode to act instantly — or just type to chat with Donna
            </p>
          </div>
        )}

        {messages.map(msg => {
          const modeCfg = msg.mode ? MODES.find(m => m.id === msg.mode) : null
          return (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {msg.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
                >
                  <Sparkles size={10} className="text-white" />
                </div>
              )}
              <div className="max-w-[88%] flex flex-col gap-1">
                {msg.role === 'user' && modeCfg && (
                  <div className="flex justify-end">
                    <span
                      className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: modeCfg.bg, color: modeCfg.color }}
                    >
                      <modeCfg.icon size={8} strokeWidth={2.5} />
                      {modeCfg.label}
                    </span>
                  </div>
                )}
                <div className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#111827] text-white rounded-tr-sm'
                    : 'bg-[#F4F4F8] text-[#111827] rounded-tl-sm',
                )}>
                  {msg.content === '' && msg.role === 'assistant' ? (
                    <span className="flex gap-1 items-center py-0.5">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce"
                          style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </span>
                  ) : renderMessage(msg.content)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mode chips + Input — pinned to bottom ── */}
      <div className="shrink-0 border-t border-donna-border px-4 pt-3 pb-3 space-y-2">

        {/* Mode selector chips — scrollable single row so all are always visible */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {MODES.map(mode => {
            const Icon = mode.icon
            const isActive = activeMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => selectMode(mode.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium',
                  'border transition-all duration-150',
                  isActive
                    ? 'border-current'
                    : 'border-[#EEEEEE] text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#374151]',
                )}
                style={isActive ? {
                  background: mode.bg,
                  color: mode.color,
                  borderColor: mode.color,
                } : {}}
              >
                <Icon size={12} strokeWidth={isActive ? 2.2 : 1.8} />
                {mode.label}
                {isActive && <X size={10} className="opacity-60 -mr-0.5" />}
              </button>
            )
          })}
        </div>

        {/* Text input */}
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 border transition-all duration-150"
          style={{
            background: '#F9F9FB',
            borderColor: activeCfg ? activeCfg.color + '50' : '#EEEEEE',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={
              activeCfg
                ? activeCfg.placeholder
                : 'Ask Donna anything…'
            }
            disabled={isBusy}
            className="flex-1 text-sm text-[#111827] placeholder:text-[#B8B8C4]
                       bg-transparent outline-none disabled:opacity-60 min-w-0"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0',
              input.trim() && !isBusy ? 'text-white' : 'bg-[#EEEEEE] text-[#C4C4CC] cursor-not-allowed',
            )}
            style={input.trim() && !isBusy
              ? { background: activeCfg ? activeCfg.color : '#7C3AED' }
              : {}
            }
          >
            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Memory ───────────────────────────────────────────────────────────────────

function MemoryTab({ notes: initialNotes }: { notes: InboxItem[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [value, setValue] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    if (!value.trim() || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const { createInboxItem } = await import('@/lib/actions/inbox')
      const result = await createInboxItem(`[memory] ${value.trim()}`)
      if (result.data) {
        setNotes(prev => [result.data!, ...prev])
      }
      setValue('')
      setSaveState('done')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      setSaveState('idle')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4">
      {/* Add form */}
      <div className="py-4 shrink-0">
        <div className="rounded-2xl border border-[#E8E8EE] bg-donna-elevated p-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
            }}
            placeholder="Write something to remember…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-[#111827]
                       placeholder:text-[#9CA3AF] outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[#C4C4CC]">↵ to save, Shift+↵ for newline</p>
            <button
              onClick={handleSave}
              disabled={!value.trim() || saveState !== 'idle'}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl
                         text-white disabled:opacity-50 transition-all"
              style={{ background: '#7C3AED' }}
            >
              {saveState === 'saving' ? <Loader2 size={11} className="animate-spin" />
                : saveState === 'done' ? <><Check size={11} /> Saved</>
                : <><Plus size={11} /> Remember this</>}
            </button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-4">
        {notes.length === 0 ? (
          <div className="py-8 text-center">
            <BookMarked size={24} className="text-[#D1D5DB] mx-auto mb-2" />
            <p className="text-sm text-[#9CA3AF]">Nothing in memory yet.</p>
          </div>
        ) : (
          notes.map((note, i) => (
            <div
              key={note.id}
              className="rounded-xl p-3 text-sm text-[#111827] leading-snug"
              style={{
                borderLeft: `3px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}`,
                background: '#FAFAFA',
                paddingLeft: 12,
                borderRadius: 0,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
              }}
            >
              <p className="line-clamp-3">{note.raw_content.replace(/^\[memory\]\s*/i, '')}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1.5">{formatNoteDate(note.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Inbox quick-view ─────────────────────────────────────────────────────────

function InboxTab({ items: initialItems }: { items: InboxItem[] }) {
  const [items, setItems] = useState(initialItems)

  const handleDismiss = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      const { dismissInboxItem } = await import('@/lib/actions/inbox')
      await dismissInboxItem(id)
    } catch { /* silent */ }
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1">
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <Inbox size={24} className="text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9CA3AF]">Inbox is clear.</p>
          <p className="text-[11px] text-[#C4C4CC] mt-0.5">Nice work.</p>
        </div>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-donna-elevated
                       transition-colors cursor-default"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#111827] leading-snug line-clamp-2">
                {item.raw_content}
              </p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">{formatNoteDate(item.created_at)}</p>
            </div>
            <button
              onClick={() => handleDismiss(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity
                         text-[#D1D5DB] hover:text-[#EF4444] shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

export default function RightPanel({ userId, memoryNotes, inboxItems }: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('chat')

  const TABS: { id: Tab; icon: typeof MessageSquare; label: string }[] = [
    { id: 'chat',   icon: MessageSquare, label: 'Chat'   },
    { id: 'memory', icon: BookMarked,    label: 'Memory' },
    { id: 'inbox',  icon: Inbox,         label: 'Inbox'  },
  ]

  return (
    <aside className="flex flex-col w-full lg:w-[320px] shrink-0 bg-donna-surface border-l border-donna-border overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-0">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
          >
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827] leading-none">Donna</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Your AI secretary</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-donna-elevated p-1 rounded-xl">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150',
                tab === id
                  ? 'bg-donna-surface text-donna-text shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              )}
            >
              <Icon size={12} strokeWidth={tab === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 mt-3">
        {tab === 'chat'   && <ChatTab userId={userId} />}
        {tab === 'memory' && <MemoryTab notes={memoryNotes} />}
        {tab === 'inbox'  && <InboxTab items={inboxItems} />}
      </div>
    </aside>
  )
}
