'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, Users, Video } from 'lucide-react'
import MemberMessage from './member-message'
import TypingIndicator from './typing-indicator'
import MemberPresence from './member-presence'
import { getMember } from '@/services/council/member-registry'
import { detectExpenseIntent, learnAccount } from '@/lib/learned-accounts'
import type { CouncilMessage } from '@/types/council/message'
import type { ApiCouncilMessage } from '@/types/council/message'
import type { MemberId } from '@/types/council/member'
import type { StreamEvent, ConferenceEvent } from '@/types/council/routing'
import type { ExpenseIntent } from '@/lib/learned-accounts'

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY     = (userId: string) => `donna_council_${userId}`
const MAX_STORED      = 60
const MAX_API_HISTORY = 20

const VALID_MEMBER_IDS = new Set(['donna', 'professor', 'aega'])

function loadMessages(userId: string): CouncilMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    if (!raw) return []
    const parsed: unknown[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Sanitize — drop any message that would crash the renderer
    return parsed.filter((m): m is CouncilMessage => {
      if (!m || typeof m !== 'object') return false
      const msg = m as Record<string, unknown>
      if (!msg.id || !msg.role || typeof msg.content !== 'string') return false
      if (msg.role === 'council' && !VALID_MEMBER_IDS.has(msg.memberId as string)) return false
      return true
    })
  } catch { return [] }
}

function saveMessages(userId: string, messages: CouncilMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(messages.slice(-MAX_STORED)))
  } catch { /* quota */ }
}

// ── API history builder ────────────────────────────────────────────────────────

function toApiHistory(messages: CouncilMessage[]): ApiCouncilMessage[] {
  return messages
    .filter(m => m.role !== 'divider')
    .slice(-MAX_API_HISTORY)
    .map(m => {
      if (m.role === 'user') return { role: 'user' as const, content: m.content }
      const member = m.memberId ? getMember(m.memberId) : null
      const prefix = member ? `[${member.name}]: ` : ''
      return { role: 'assistant' as const, content: `${prefix}${m.content}` }
    })
}

let _seq = 0
function uid() { return `${Date.now()}-${++_seq}` }

// ── Conference trigger detection ───────────────────────────────────────────────

const CONFERENCE_RE = /\b(arrange|set up|call|have|start|need|want|let'?s have)\s+a?\s*(conference|council meeting|full council|group discussion|team meeting|council session)\b|conference (on|about|regarding|for)\b|(get (everyone|the (team|council)) together)|(discuss (this|it|that) (as a|with the) (group|team|council))/i

function isConferenceTrigger(text: string): boolean {
  return CONFERENCE_RE.test(text)
}

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What's on my plate today?",
  "Aega, be direct — is my spending okay?",
  "Professor, plan out my next launch",
  "Arrange a conference on my travel budget",
]

// ── Account picker (shown when Vaultr can't resolve account automatically) ────

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  savings:    '#10B981',
  checking:   '#3B82F6',
  credit:     '#EF4444',
  cash:       '#F59E0B',
  investment: '#8B5CF6',
  loan:       '#EC4899',
  other:      '#6B7280',
}

interface AccountChoice { id: string; name: string; type: string }

function AccountPicker({ accounts, onPick, disabled }: {
  accounts:  AccountChoice[]
  onPick:    (id: string, name: string, type: string) => void
  disabled:  boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 ml-8 mt-1 mb-0.5">
      {accounts.map(acct => {
        const color    = ACCOUNT_TYPE_COLOR[acct.type] ?? ACCOUNT_TYPE_COLOR.other
        const initials = acct.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        return (
          <button
            key={acct.id}
            onClick={() => onPick(acct.id, acct.name, acct.type)}
            disabled={disabled}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: `color-mix(in srgb, ${color} 8%, var(--c-elevated))`,
              border:     `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            }}
          >
            {/* Account avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] text-white"
              style={{ background: color }}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--c-text)' }}>
                {acct.name}
              </span>
              <span className="text-[10px] capitalize leading-tight mt-0.5" style={{ color }}>
                {acct.type}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Conference round divider ───────────────────────────────────────────────────

function ConferenceDivider({ label, round }: { label: string; round: number }) {
  const colors = ['#7C3AED', '#1D4ED8', '#7C3AED']
  const color  = colors[(round - 1) % colors.length]
  return (
    <div className="flex items-center gap-2 my-2 px-1">
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
      <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{ color, background: `${color}12` }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  )
}

// ── Conference banner ──────────────────────────────────────────────────────────

function ConferenceBanner({ topic }: { topic: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mx-1 mb-1"
      style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
      <Video size={11} style={{ color: '#7C3AED' }} />
      <span className="text-[10px] font-medium" style={{ color: '#7C3AED' }}>Conference</span>
      <span className="text-[10px] text-donna-subtle truncate">— {topic}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface PendingAccountPick {
  messageId:     string
  rawText:       string
  expenseIntent: ExpenseIntent
  accounts:      AccountChoice[]
}

interface CouncilChatProps {
  userId:       string
  displayName?: string
}

export default function CouncilChat({ userId, displayName }: CouncilChatProps) {
  const [messages, setMessages]                   = useState<CouncilMessage[]>([])
  const [input, setInput]                         = useState('')
  const [isBusy, setIsBusy]                       = useState(false)
  const [typingMembers, setTypingMembers]         = useState<MemberId[]>([])
  const [mounted, setMounted]                     = useState(false)
  const [conferenceMode, setConferenceMode]       = useState(false)
  const [pendingAccountPick, setPendingAccountPick] = useState<PendingAccountPick | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMessages(loadMessages(userId)); setMounted(true) }, [userId])
  useEffect(() => { if (mounted) saveMessages(userId, messages) }, [messages, userId, mounted])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typingMembers])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const addDonnaMessage = (content: string) => {
    setMessages(prev => [...prev, { id: uid(), role: 'council', memberId: 'donna', content, timestamp: Date.now() }])
  }

  // ── Silent background expense logging ─────────────────────────────────────────
  // Donna already acknowledged the expense in her streamed reply.
  // This just writes the record to Vaultr — no UI feedback needed.
  const silentLogExpense = useCallback(async (intent: ExpenseIntent) => {
    if (!intent.isExpense) return
    try {
      // If we already know the preferred account, pin it; otherwise let the API
      // parse the account name from the raw message text (e.g. "from HDFC Savings").
      const body = intent.learnedAccount
        ? { text: intent.rawText, accountId: intent.learnedAccount.accountId }
        : { text: intent.rawText }

      const res  = await fetch('/api/finance/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const json = await res.json() as {
        result?: {
          status:    string
          message?:  string
          accounts?: AccountChoice[]
          data?:     Record<string, unknown>
        }
      }
      const result = json.result
      if (!result) return

      if (result.status === 'choose_account' && result.accounts?.length) {
        // API can't resolve the account — show picker chips in chat
        const msgId = uid()
        setMessages(prev => [...prev, {
          id: msgId, role: 'council', memberId: 'donna',
          content: result.message ?? 'Which account should I log this to?',
          timestamp: Date.now(),
        }])
        setPendingAccountPick({ messageId: msgId, rawText: intent.rawText, expenseIntent: intent, accounts: result.accounts })

      } else if (result.status === 'success' && intent.category) {
        // Auto-resolved — learn the account for next time
        const accountId   = result.data?.accountId as string | undefined
        const accountName = result.data?.accountName as string | undefined
        const accountType = result.data?.accountType as string | undefined
        if (accountId && accountName) {
          learnAccount(intent.category, { accountId, accountName, accountType: accountType ?? 'other' })
        }
      }
    } catch { /* silent */ }
  }, [])

  // ── Handle user picking an account from the picker ─────────────────────────
  const handleAccountPick = useCallback(async (accountId: string, accountName: string, accountType: string) => {
    if (!pendingAccountPick) return
    const { messageId, expenseIntent } = pendingAccountPick

    // Immediately update Donna's message + hide picker
    setMessages(prev => prev.map(m => m.id === messageId
      ? { ...m, content: `Logging to ${accountName}…` }
      : m
    ))
    setPendingAccountPick(null)

    try {
      const res  = await fetch('/api/finance/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ text: expenseIntent.rawText, accountId }),
      })
      const json = await res.json() as { result?: { status: string; message?: string } }
      const result = json.result

      if (result?.status === 'success') {
        setMessages(prev => prev.map(m => m.id === messageId
          ? { ...m, content: `✓ Logged to ${accountName}` }
          : m
        ))
        if (expenseIntent.category) {
          learnAccount(expenseIntent.category, { accountId, accountName, accountType })
        }
      } else {
        setMessages(prev => prev.map(m => m.id === messageId
          ? { ...m, content: result?.message ?? 'Couldn\'t log the expense — please try again.' }
          : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, content: 'Something went wrong logging the expense.' }
        : m
      ))
    }
  }, [pendingAccountPick])

  // ── Conference stream ──────────────────────────────────────────────────────────
  const runConference = useCallback(async (topic: string) => {
    setIsBusy(true)
    setConferenceMode(true)
    busyTimer.current = setTimeout(() => setIsBusy(false), 120_000)

    // Conference banner
    setMessages(prev => [...prev, { id: uid(), role: 'divider', content: '', timestamp: Date.now(), roundLabel: topic, round: 0 }])

    try {
      const res = await fetch('/api/council/conference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, userId }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   currentMemberId: MemberId | null = null
      let   currentMsgId:    string | null   = null

      const flush = (data: string) => {
        buffer += data
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '').trim()
          if (!line) continue
          try {
            const event: ConferenceEvent = JSON.parse(line)

            if (event.phase === 'round_start' && event.roundLabel && event.round) {
              setMessages(prev => [...prev, {
                id: uid(), role: 'divider', content: '', timestamp: Date.now(),
                roundLabel: event.roundLabel, round: event.round,
              }])
            }

            else if (event.phase === 'member_start' && event.memberId) {
              currentMemberId = event.memberId
              currentMsgId    = uid()
              setMessages(prev => [...prev, {
                id: currentMsgId!, role: 'council', memberId: currentMemberId!,
                content: '', timestamp: Date.now(), isStreaming: true,
              }])
            }

            else if (event.phase === 'text' && event.text && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: m.content + event.text! } : m))
            }

            else if (event.phase === 'member_end' && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m))
              currentMemberId = null; currentMsgId = null
            }

            else if (event.phase === 'done') {
              setIsBusy(false)
              setConferenceMode(false)
              if (busyTimer.current) clearTimeout(busyTimer.current)
            }

          } catch { /* malformed */ }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        flush(decoder.decode(value, { stream: true }))
      }

    } catch (err) {
      addDonnaMessage(`Conference failed — ${err instanceof Error ? err.message : 'please try again'}`)
    } finally {
      setIsBusy(false)
      setConferenceMode(false)
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
  }, [userId])

  // ── Send ───────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isBusy) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    // Conference trigger — extract topic and run conference flow
    if (isConferenceTrigger(content)) {
      const userMsg: CouncilMessage = { id: uid(), role: 'user', content, timestamp: Date.now() }
      setMessages(prev => [...prev, userMsg])
      const topic = content.replace(CONFERENCE_RE, '').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').trim() || content
      await runConference(topic)
      return
    }

    // Detect expense before sending so we can silent-log after Donna replies
    const expenseIntent = detectExpenseIntent(content)

    const userMsg: CouncilMessage = { id: uid(), role: 'user', content, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsBusy(true)

    busyTimer.current = setTimeout(() => setIsBusy(false), 45_000)

    try {
      const history = toApiHistory([...messages, userMsg])
      const res = await fetch('/api/council', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, userId, expenseIntent: expenseIntent.isExpense ? expenseIntent : null }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   currentMemberId: MemberId | null = null
      let   currentMsgId:    string | null   = null

      const flush = (data: string) => {
        buffer += data
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '').trim()
          if (!line || line === '[DONE]') continue
          try {
            const event: StreamEvent = JSON.parse(line)
            if (event.phase === 'member_start' && event.memberId) {
              currentMemberId = event.memberId
              currentMsgId    = uid()
              setMessages(prev => [...prev, { id: currentMsgId!, role: 'council', memberId: currentMemberId!, content: '', timestamp: Date.now(), isStreaming: true }])
              setTypingMembers(prev => prev.filter(id => id !== currentMemberId))
            }
            else if (event.phase === 'text' && event.text && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: m.content + event.text! } : m))
            }
            else if (event.phase === 'member_end' && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m))
              currentMemberId = null; currentMsgId = null
            }
            else if (event.phase === 'done') {
              setTypingMembers([]); setIsBusy(false)
              if (busyTimer.current) clearTimeout(busyTimer.current)
              // Donna acknowledged inline — now silently write the record
              if (expenseIntent.isExpense) {
                silentLogExpense(expenseIntent)
              }
            }
          } catch { /* malformed */ }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        flush(decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      addDonnaMessage(`Something went wrong — ${err instanceof Error ? err.message : 'please try again'}`)
    } finally {
      setTypingMembers([]); setIsBusy(false)
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
  }, [input, isBusy, messages, userId, runConference, silentLogExpense])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleClear = () => { setMessages([]); saveMessages(userId, []) }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-donna-border shrink-0">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-donna-subtle" />
          <span className="text-[10px] font-semibold text-donna-subtle uppercase tracking-wider">Council</span>
          {conferenceMode && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
              <Video size={8} /> Conference
            </span>
          )}
        </div>
        <MemberPresence compact />
        {messages.length > 0 && (
          <button onClick={handleClear}
            className="text-[10px] text-donna-subtle hover:text-donna-muted transition-colors flex items-center gap-1">
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {isEmpty && !isBusy ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-6">
            <div className="flex items-center gap-1 mt-auto">
              {(['donna', 'professor', 'aega'] as MemberId[]).map((id, i) => {
                const m = getMember(id)
                return (
                  <div key={id} className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                    style={{ background: m.accentColor, marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i, boxShadow: '0 0 0 2px var(--c-surface)' }}>
                    {m.initial}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-donna-muted text-center max-w-[200px] leading-relaxed">
              Your council is ready.<br />Ask anything — the right people will respond.
            </p>
            <div className="flex flex-col gap-1.5 w-full mt-auto">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-left text-[11px] text-donna-muted px-3 py-2 rounded-xl border border-donna-border hover:border-donna-text hover:text-donna-text transition-colors leading-snug">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              // Conference / round dividers
              if (msg.role === 'divider') {
                if (msg.round === 0) return <ConferenceBanner key={msg.id} topic={msg.roundLabel ?? ''} />
                return <ConferenceDivider key={msg.id} label={msg.roundLabel ?? ''} round={msg.round ?? 1} />
              }
              const el = <MemberMessage key={msg.id} message={msg} userDisplayName={displayName} />
              // If this message is the account-pick prompt, append picker chips below it
              if (pendingAccountPick?.messageId === msg.id) {
                return (
                  <div key={msg.id} className="flex flex-col gap-1">
                    {el}
                    <AccountPicker
                      accounts={pendingAccountPick.accounts}
                      onPick={handleAccountPick}
                      disabled={isBusy}
                    />
                  </div>
                )
              }
              return el
            })}

            {typingMembers.map(id => <TypingIndicator key={id} memberId={id} />)}
            {isBusy && typingMembers.length === 0 && !messages.some(m => m.isStreaming) && (
              <TypingIndicator memberId="donna" />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-donna-border px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask the council anything…"
            rows={1}
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none resize-none leading-relaxed py-1"
            style={{ WebkitAppearance: 'none' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isBusy}
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: input.trim() && !isBusy ? 'var(--c-violet)' : 'var(--c-elevated)' }}
          >
            <Send size={13} style={{ color: input.trim() && !isBusy ? '#fff' : 'var(--c-subtle)' }} />
          </button>
        </div>
        <p className="text-[9px] text-donna-subtle mt-1.5 px-0.5 opacity-60">
          Say "arrange a conference on X" to get all perspectives
        </p>
      </div>
    </div>
  )
}
