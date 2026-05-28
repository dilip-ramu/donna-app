'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles, Send, Plus, Check, Loader2, Trash2,
  MessageSquare, BookMarked, Inbox,
  CheckSquare, Brain, CalendarDays, PenLine, X, Landmark, ExternalLink,
  ChevronRight, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { InboxItem } from '@/lib/types'
import { BORDER_COLORS } from '@/lib/donna-theme'
import CouncilChat from '@/components/chat/council-chat'
import MemberAvatar from '@/components/chat/member-avatar'
import type { MemberId } from '@/types/council/member'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'memory' | 'inbox'
type ChatMode = 'tasks' | 'memory' | 'calendar' | 'draft' | 'finance'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
  ts: Date
  accounts?: { id: string; name: string; type: string }[]  // for account chooser
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
  placeholder: string
  color: string
  bg: string
  systemHint: string
}[] = [
  {
    id: 'tasks',
    icon: CheckSquare,
    label: 'Tasks',
    placeholder: 'Add a task — "Call John 25/06"',
    color: '#7C3AED',
    bg: '#F5F3FF',
    systemHint: 'The user wants help with tasks — adding, completing, or reviewing their task list.',
  },
  {
    id: 'memory',
    icon: Brain,
    label: 'Memory',
    placeholder: 'Capture a thought to remember…',
    color: '#3B82F6',
    bg: '#EFF6FF',
    systemHint: 'The user wants to capture or retrieve a memory or note.',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    label: 'Calendar',
    placeholder: 'What do you want to schedule?',
    color: '#10B981',
    bg: '#ECFDF5',
    systemHint: 'The user wants help with their calendar — scheduling, checking upcoming events.',
  },
  {
    id: 'draft',
    icon: PenLine,
    label: 'Draft',
    placeholder: 'What would you like to write?',
    color: '#F59E0B',
    bg: '#FFFBEB',
    systemHint: 'The user wants help drafting or writing something — email, message, document.',
  },
  {
    id: 'finance',
    icon: Landmark,
    label: 'Finance',
    placeholder: 'Spent ₹500 at Starbucks for coffee…',
    color: '#10B981',
    bg: '#ECFDF5',
    systemHint: 'The user wants to log a financial transaction or query their finance data in Vaultr.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function renderMessage(content: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0, m: RegExpExecArray | null

  while ((m = linkRe.exec(content)) !== null) {
    if (m.index > last) parts.push(renderBold(content.slice(last, m.index), parts.length + 'pre'))
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline text-[#7C3AED] hover:opacity-80">
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

function parseDateFromText(text: string): { title: string; dueDate: string | null } {
  const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/
  const match = text.match(DATE_RE)
  if (!match) return { title: text.trim(), dueDate: null }

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  let year: number
  if (match[3]) {
    const raw = parseInt(match[3], 10)
    year = raw < 100 ? 2000 + raw : raw
  } else {
    const now = new Date()
    year = now.getFullYear()
    const candidate = new Date(year, month - 1, day)
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (candidate < yesterday) year += 1
  }

  const d = new Date(year, month - 1, day)
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return { title: text.trim(), dueDate: null }

  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const title = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim() || text.trim()
  return { title, dueDate }
}

// ── Personal fact detector — auto-save to memory ──────────────────────────────
const PERSONAL_FACT_RE = [
  /\bmy (?:birthday|birth ?date|dob)\b/i,
  /\b(?:i was |i'm |i am )?born (?:on|in)\b/i,
  /\bmy (?:wife|husband|partner|spouse|girlfriend|boyfriend|fianc[eé]{1,2})'?s?\b/i,
  /\bmy (?:son|daughter|kid|child|baby)'?s?\b/i,
  /\bmy (?:mom|mother|dad|father|parent|brother|sister|sibling)'?s?\b/i,
  /\bour (?:anniversary|wedding)\b/i,
  /\bmy (?:full )?name is\b/i,
  /\bi (?:live in|am from|grew up in|moved to)\b/i,
  /\bmy (?:job|role|title|company|employer|business)\b/i,
  /\bmy (?:phone|email|address|number) (?:is|was)\b/i,
  /\bi (?:am allergic|can't eat|don't eat|am vegetarian|am vegan)\b/i,
  /\bmy (?:favourite|favorite)\b/i,
  /\bi (?:prefer|always|usually|never)\b/i,
]

function isPersonalFact(text: string): boolean {
  return PERSONAL_FACT_RE.some(re => re.test(text))
}

// Suggested prompts for empty state
const SUGGESTIONS = [
  { text: "What's on my plate today?", mode: null },
  { text: 'Log ₹500 coffee from Amex', mode: 'finance' as ChatMode },
  { text: 'Add task: Review proposal', mode: 'tasks' as ChatMode },
  { text: 'Show pending recoverables', mode: 'finance' as ChatMode },
]

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

const CHAT_STORAGE_KEY = (uid: string) => `donna_chat_${uid}`
const MAX_STORED_MSGS  = 40

function loadMessages(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as (Omit<ChatMessage, 'ts'> & { ts: string })[]
    return parsed.map(m => ({ ...m, ts: new Date(m.ts) }))
  } catch { return [] }
}

function saveMessages(userId: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY(userId), JSON.stringify(msgs.slice(-MAX_STORED_MSGS)))
  } catch { /* quota exceeded — ignore */ }
}

function ChatTab({ userId }: { userId: string }) {
  const [messages, setMessages]             = useState<ChatMessage[]>(() => loadMessages(userId))
  const [input, setInput]                   = useState('')
  const [activeMode, setActiveMode]         = useState<ChatMode | null>(null)
  const [isBusy, setIsBusy]                 = useState(false)
  const [pendingFinanceText, setPendingFinanceText] = useState<string | null>(null)
  const [pendingAccounts, setPendingAccounts] = useState<{ id: string; name: string; type: string }[] | null>(null)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const scrollRef      = useRef<HTMLDivElement>(null)
  const streamingIdRef = useRef<string | null>(null)
  const busyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    // Don't save mid-stream (empty assistant placeholder)
    const settled = messages.filter(m => m.content !== '' || m.role === 'user')
    saveMessages(userId, settled)
  }, [userId, messages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Safety: clear stuck busy state after 35s
  useEffect(() => {
    if (isBusy) {
      busyTimerRef.current = setTimeout(() => setIsBusy(false), 35_000)
    } else {
      if (busyTimerRef.current) clearTimeout(busyTimerRef.current)
    }
    return () => { if (busyTimerRef.current) clearTimeout(busyTimerRef.current) }
  }, [isBusy])

  const growTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const selectMode = (mode: ChatMode) => {
    setActiveMode(prev => prev === mode ? null : mode)
    setTimeout(() => { textareaRef.current?.focus() }, 50)
  }

  const refocusInput = () => setTimeout(() => textareaRef.current?.focus(), 100)

  // ── Tasks / Memory / Calendar ─────────────────────────────────────────────
  const handleActionMode = async (content: string, mode: ChatMode) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode, ts: new Date() }
    const respId = uid()
    setMessages(prev => [...prev, userMsg, { id: respId, role: 'assistant', content: '', ts: new Date() }])
    setIsBusy(true)

    try {
      let reply = ''
      if (mode === 'tasks') {
        const { title, dueDate } = parseDateFromText(content)
        const { createTask } = await import('@/lib/actions/tasks')
        const result = await createTask({ title, status: 'active', priority: 'medium', ...(dueDate ? { due_date: dueDate } : {}) })
        if (result.error) {
          reply = `Couldn't add that. ${result.error}`
        } else if (dueDate) {
          const due = new Date(dueDate + 'T12:00:00')
          const todayStr = new Date().toISOString().split('T')[0]
          const dueLabel = dueDate === todayStr
            ? 'due today'
            : `due ${due.toLocaleDateString([], { day: 'numeric', month: 'short' })}`
          reply = `✓ Added — "${title}" · ${dueLabel}`
        } else {
          reply = `✓ Added — "${title}"`
        }
      } else if (mode === 'memory') {
        const { createInboxItem } = await import('@/lib/actions/inbox')
        const result = await createInboxItem(`[memory] ${content}`)
        reply = result.error ? `Couldn't save that. ${result.error}` : `✓ Remembered — "${content}"`
      } else if (mode === 'calendar') {
        const { createInboxItem } = await import('@/lib/actions/inbox')
        const result = await createInboxItem(`[calendar] ${content}`)
        reply = result.error ? `Couldn't capture that. ${result.error}` : `📅 Captured — "${content}"`
      }
      setMessages(prev => prev.map(m => m.id === respId ? { ...m, content: reply } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === respId ? { ...m, content: 'Something went wrong. Try again.' } : m))
    } finally {
      setIsBusy(false)
      refocusInput()
    }
  }

  // ── Finance ───────────────────────────────────────────────────────────────
  const handleFinanceMode = async (content: string, chosenAccountId?: string) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode: 'finance', ts: new Date() }
    const respId = uid()
    setMessages(prev => [...prev, userMsg, { id: respId, role: 'assistant', content: '', ts: new Date() }])
    setIsBusy(true)
    setPendingFinanceText(content)

    try {
      const res = await fetch('/api/finance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, ...(chosenAccountId ? { accountId: chosenAccountId } : {}) }),
      })

      const json = await res.json() as {
        result?: { status: string; message: string; redirectUrl?: string; accounts?: { id: string; name: string; type: string }[] }
        error?: string
      }

      if (!res.ok || json.error) {
        setMessages(prev => prev.map(m => m.id === respId ? { ...m, content: json.error ?? 'Finance action failed.' } : m))
        return
      }

      const result = json.result!
      let reply = result.message
      if (result.status === 'redirect' && result.redirectUrl) {
        reply += `\n\n[Open in Vaultr →](${result.redirectUrl})`
      }

      // Account chooser — show chips when multiple accounts match
      const accounts = result.status === 'choose_account' ? result.accounts : undefined
      if (result.status !== 'choose_account') {
        setPendingFinanceText(null)
        setPendingAccounts(null)
      } else if (accounts) {
        setPendingAccounts(accounts)
      }

      setMessages(prev => prev.map(m =>
        m.id === respId ? { ...m, content: reply, accounts } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === respId ? { ...m, content: 'Could not reach Vaultr. Check your connection.' } : m
      ))
    } finally {
      setIsBusy(false)
      refocusInput()
    }
  }

  // ── AI chat (Draft / general) ─────────────────────────────────────────────
  const handleChat = async (content: string, mode: ChatMode | null) => {
    const modeConfig = mode ? MODES.find(m => m.id === mode) : null
    const fullContent = modeConfig ? `[Context: ${modeConfig.systemHint}]\n\n${content}` : content

    // Capture history BEFORE state update
    const history = messages
      .slice(-16)
      .filter(m => m.content) // skip empty pending
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const userMsg: ChatMessage = { id: uid(), role: 'user', content, mode: mode ?? undefined, ts: new Date() }
    const assistantId = uid()
    streamingIdRef.current = assistantId
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', ts: new Date() }])
    setIsBusy(true)

    try {
      const apiMessages = [
        ...history,
        { role: 'user' as const, content: fullContent },
      ]

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, userId }),
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
      // Auto-save personal facts to memory (fire-and-forget)
      if (isPersonalFact(content)) {
        import('@/lib/actions/inbox').then(({ createInboxItem }) =>
          createInboxItem(`[memory] ${content.trim()}`)
        )
      }
    } catch {
      const id = streamingIdRef.current
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, content: "I'm having trouble connecting. Please try again." } : m
      ))
    } finally {
      setIsBusy(false)
      refocusInput()
    }
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || isBusy) return
    setInput('')
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // If we're waiting for an account answer, treat typed text as account selection
    if (pendingFinanceText && pendingAccounts) {
      const q = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      // Try to fuzzy-match the typed reply against the pending accounts
      const match =
        pendingAccounts.find(a => a.name.toLowerCase().replace(/[^a-z0-9\s]/g, '') === q) ||
        pendingAccounts.find(a => a.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').includes(q) || q.includes(a.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')))

      const originalText = pendingFinanceText
      setPendingFinanceText(null)
      setPendingAccounts(null)

      if (match) {
        await handleFinanceMode(originalText, match.id)
      } else {
        // Couldn't match — re-try with the new account hint as part of the original sentence
        await handleFinanceMode(`${originalText} from ${content}`)
      }
      return
    }

    if (activeMode === 'tasks' || activeMode === 'memory' || activeMode === 'calendar') {
      await handleActionMode(content, activeMode)
    } else if (activeMode === 'finance') {
      await handleFinanceMode(content)
    } else {
      await handleChat(content, activeMode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, userId, isBusy, activeMode, messages, pendingFinanceText, pendingAccounts])

  const activeCfg = MODES.find(m => m.id === activeMode)

  const clearChat = () => {
    setMessages([])
    setPendingFinanceText(null)
    setPendingAccounts(null)
    try { localStorage.removeItem(CHAT_STORAGE_KEY(userId)) } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Messages header (only when there are messages) ── */}
      {messages.length > 0 && (
        <div className="shrink-0 flex items-center justify-end px-4 pt-2 pb-0.5">
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-[11px] text-donna-subtle hover:text-[#EF4444] transition-colors"
          >
            <Trash2 size={11} />
            Clear chat
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 pb-2 space-y-3">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="py-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(147,51,234,0.12))' }}>
                <Sparkles size={18} className="text-[#7C3AED]" />
              </div>
              <p className="text-sm font-semibold text-donna-text">Hi, I&apos;m Donna</p>
              <p className="text-[12px] text-donna-subtle mt-0.5 leading-relaxed">
                Just type to chat. Use the chips below for<br />tasks, memory, finance, and more.
              </p>
            </div>
            {/* Quick suggestions */}
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.text}
                  onClick={() => {
                    if (s.mode) setActiveMode(s.mode)
                    setInput(s.text)
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  className="flex items-center justify-between w-full text-left px-3.5 py-2.5
                             rounded-xl border border-donna-border text-[13px] text-donna-muted
                             hover:border-[#D8B4FE] hover:text-[#7C3AED] hover:bg-[#FAFAFF]
                             transition-all duration-150 group"
                >
                  <span>{s.text}</span>
                  <ChevronRight size={13} className="text-donna-subtle group-hover:text-[#7C3AED] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => {
          const modeCfg = msg.mode ? MODES.find(m => m.id === msg.mode) : null
          return (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}>
                  <Sparkles size={10} className="text-white" />
                </div>
              )}
              <div className="max-w-[88%] flex flex-col gap-1.5">
                {msg.role === 'user' && modeCfg && (
                  <div className="flex justify-end">
                    <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: modeCfg.bg, color: modeCfg.color }}>
                      <modeCfg.icon size={8} strokeWidth={2.5} />
                      {modeCfg.label}
                    </span>
                  </div>
                )}
                <div className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-donna-text text-donna-surface rounded-tr-sm'
                    : 'bg-donna-elevated text-donna-text rounded-tl-sm',
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

                {/* Account chooser chips */}
                {msg.accounts && msg.accounts.length > 0 && pendingFinanceText && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {msg.accounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          const txt = pendingFinanceText
                          setPendingFinanceText(null)
                          setPendingAccounts(null)
                          if (txt) handleFinanceMode(txt, acc.id)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                                   border border-[#D8B4FE] text-[#7C3AED] bg-[#FAFAFF]
                                   hover:bg-donna-violet-light active:scale-95 transition-all"
                      >
                        <Landmark size={11} />
                        {acc.name}
                        <span className="text-[9px] opacity-60 capitalize">{acc.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-donna-border px-3 pt-2.5 pb-3 space-y-2">

        {/* Mode chips */}
        <div className="flex flex-wrap gap-1.5">
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
                  isActive ? 'border-current' : 'border-donna-border text-donna-muted hover:border-donna-border hover:text-donna-muted',
                )}
                style={isActive ? { background: mode.bg, color: mode.color, borderColor: mode.color } : {}}
              >
                <Icon size={12} strokeWidth={isActive ? 2.2 : 1.8} />
                {mode.label}
                {isActive && <X size={10} className="opacity-60 -mr-0.5" />}
              </button>
            )
          })}
        </div>

        {/* Single unified input box — no inner box */}
        <div
          className="flex items-end gap-2 rounded-2xl px-3.5 py-2.5 transition-all duration-150"
          style={{
            border: `1.5px solid ${activeCfg ? activeCfg.color + '55' : '#E5E7EB'}`,
            background: 'var(--c-surface, #FAFAFA)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); growTextarea() }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={activeCfg ? activeCfg.placeholder : 'Ask Donna anything…'}
            rows={1}
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle
                       bg-transparent resize-none outline-none border-none
                       leading-relaxed min-w-0 appearance-none"
            style={{
              minHeight: 22,
              maxHeight: 120,
              WebkitAppearance: 'none',
              // Ensure it's always interactive even when parent is loading
              opacity: 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 mb-0.5',
              input.trim() ? 'text-white' : 'bg-donna-elevated text-donna-subtle cursor-default',
            )}
            style={input.trim() ? { background: activeCfg ? activeCfg.color : '#7C3AED' } : {}}
          >
            {isBusy
              ? <Loader2 size={12} className="animate-spin" style={{ color: activeCfg?.color ?? '#7C3AED' }} />
              : <Send size={12} />
            }
          </button>
        </div>

        {isBusy && (
          <p className="text-[10px] text-donna-subtle text-center -mt-1">
            Donna is thinking…
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Memory Tab ───────────────────────────────────────────────────────────────

function MemoryTab({ notes: initialNotes }: { notes: InboxItem[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [value, setValue] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Refresh from DB on mount (catches items added via chat since page load)
  useEffect(() => {
    let cancelled = false
    import('@/lib/actions/inbox').then(({ getMemoryNotes }) =>
      getMemoryNotes().then(fresh => { if (!cancelled) setNotes(fresh) })
    )
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    if (!value.trim() || saveState !== 'idle') return
    setSaveState('saving')
    try {
      const { createInboxItem, getMemoryNotes } = await import('@/lib/actions/inbox')
      const result = await createInboxItem(`[memory] ${value.trim()}`)
      if (result.error) { setSaveState('idle'); return }
      // Refresh the full list so order and deduplication are correct
      const fresh = await getMemoryNotes()
      setNotes(fresh)
      setValue('')
      setSaveState('done')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      setSaveState('idle')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4">
      <div className="py-3 shrink-0">
        <div className="rounded-2xl border border-donna-border bg-donna-elevated p-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            placeholder="Write something to remember…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-donna-text
                       placeholder:text-donna-subtle outline-none leading-relaxed appearance-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-donna-subtle">↵ to save</p>
            <button
              onClick={handleSave}
              disabled={!value.trim() || saveState !== 'idle'}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl
                         text-white disabled:opacity-50 transition-all"
              style={{ background: '#7C3AED' }}
            >
              {saveState === 'saving' ? <Loader2 size={11} className="animate-spin" />
                : saveState === 'done' ? <><Check size={11} /> Saved</>
                : <><Plus size={11} /> Remember</>}
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-4">
        {notes.length === 0 ? (
          <div className="py-8 text-center">
            <BookMarked size={24} className="text-donna-subtle mx-auto mb-2" />
            <p className="text-sm text-donna-subtle">Nothing in memory yet.</p>
          </div>
        ) : (
          notes.map((note, i) => (
            <div key={note.id} className="text-sm text-donna-text leading-snug py-2.5 px-3"
              style={{
                borderLeft: `3px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}`,
                background: 'var(--c-elevated)',
                borderRadius: '0 10px 10px 0',
              }}>
              <p className="line-clamp-3">{note.raw_content.replace(/^\[memory\]\s*/i, '')}</p>
              <p className="text-[10px] text-donna-subtle mt-1.5">{formatNoteDate(note.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Inbox Tab ────────────────────────────────────────────────────────────────

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
    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-1">
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <Inbox size={24} className="text-donna-subtle mx-auto mb-2" />
          <p className="text-sm text-donna-subtle">Inbox is clear.</p>
          <p className="text-[11px] text-donna-subtle mt-0.5">Nice work.</p>
        </div>
      ) : (
        items.map(item => (
          <div key={item.id}
            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-donna-elevated transition-colors cursor-default">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-donna-text leading-snug line-clamp-2">{item.raw_content}</p>
              <p className="text-[10px] text-donna-subtle mt-1">{formatNoteDate(item.created_at)}</p>
            </div>
            <button onClick={() => handleDismiss(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-donna-subtle hover:text-[#EF4444] shrink-0 mt-0.5"
              aria-label="Dismiss">
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
      <div className="shrink-0 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            {/* Stacked council avatars */}
            <div className="flex items-center">
              {(['donna', 'professor', 'aega'] as MemberId[]).map((id, i) => (
                <div key={id} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: 3 - i }}>
                  <MemberAvatar memberId={id} size="sm" showRing />
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-donna-text leading-none">Council</p>
              <p className="text-[10px] text-donna-subtle mt-0.5">Donna · Professor · Aega</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 bg-donna-elevated p-1 rounded-xl">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150',
                tab === id
                  ? 'bg-donna-surface text-donna-text shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-donna-muted hover:text-donna-text'
              )}>
              <Icon size={12} strokeWidth={tab === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 mt-2">
        {tab === 'chat'   && <CouncilChat userId={userId} />}
        {tab === 'memory' && <MemoryTab notes={memoryNotes} />}
        {tab === 'inbox'  && <InboxTab items={inboxItems} />}
      </div>
    </aside>
  )
}
