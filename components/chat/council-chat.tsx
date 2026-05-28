'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, Users, Check, Loader2 } from 'lucide-react'
import MemberMessage from './member-message'
import TypingIndicator from './typing-indicator'
import MemberPresence from './member-presence'
import { getMember } from '@/services/council/member-registry'
import {
  detectExpenseIntent, learnAccount, CONFIRM_RE, CANCEL_RE,
} from '@/lib/learned-accounts'
import type { CouncilMessage } from '@/types/council/message'
import type { ApiCouncilMessage } from '@/types/council/message'
import type { MemberId } from '@/types/council/member'
import type { StreamEvent } from '@/types/council/routing'
import type { ExpenseIntent } from '@/lib/learned-accounts'

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY     = (userId: string) => `donna_council_${userId}`
const MAX_STORED      = 60
const MAX_API_HISTORY = 20

function loadMessages(userId: string): CouncilMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveMessages(userId: string, messages: CouncilMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(messages.slice(-MAX_STORED)))
  } catch { /* quota */ }
}

// ── API history builder ────────────────────────────────────────────────────────

function toApiHistory(messages: CouncilMessage[]): ApiCouncilMessage[] {
  return messages.slice(-MAX_API_HISTORY).map(m => {
    if (m.role === 'user') return { role: 'user' as const, content: m.content }
    const member = m.memberId ? getMember(m.memberId) : null
    const prefix = member ? `[${member.name}]: ` : ''
    return { role: 'assistant' as const, content: `${prefix}${m.content}` }
  })
}

let _seq = 0
function uid() { return `${Date.now()}-${++_seq}` }

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What's on my plate today?",
  "How should I plan my next launch?",
  "What are my pending recoverables?",
  "Help me think through my priorities this week",
]

// ── Pending expense types ──────────────────────────────────────────────────────

interface AccountChoice { id: string; name: string; type: string }

interface PendingExpense {
  intent:     ExpenseIntent
  // Set when finance API returns choose_account
  accountChoices?: AccountChoice[]
}

// ── Action bar — shown below Aega's message when expense is pending ────────────

function ExpenseActionBar({
  pending,
  onConfirm,
  onPickAccount,
  onCancel,
  logging,
}: {
  pending:       PendingExpense
  onConfirm:     (accountId?: string) => void
  onPickAccount: (id: string, name: string, type: string) => void
  onCancel:      () => void
  logging:       boolean
}) {
  const aega          = getMember('aega')
  const learnedAcc    = pending.intent.learnedAccount
  const accountOptions = pending.accountChoices ?? []

  if (accountOptions.length > 0) {
    // Account chooser mode
    return (
      <div className="flex flex-col gap-2 pl-9 mt-1 animate-fade-in">
        <p className="text-[10px] text-donna-subtle px-0.5">Pick an account:</p>
        <div className="flex flex-wrap gap-1.5">
          {accountOptions.map(acc => (
            <button
              key={acc.id}
              onClick={() => onPickAccount(acc.id, acc.name, acc.type)}
              disabled={logging}
              className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-xl border
                         transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: aega.accentColor + '60',
                color:       aega.accentColor,
                background:  aega.accentBg,
              }}
            >
              {acc.name}
              <span className="text-[9px] opacity-60 capitalize">{acc.type}</span>
            </button>
          ))}
          <button
            onClick={onCancel}
            className="text-[11px] px-3 py-1.5 rounded-xl text-donna-subtle hover:text-donna-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Confirm mode
  const confirmLabel = learnedAcc
    ? `Log to ${learnedAcc.accountName}`
    : 'Yes, log it'

  return (
    <div className="flex items-center gap-2 pl-9 mt-1 animate-fade-in">
      <button
        onClick={() => onConfirm(learnedAcc?.accountId)}
        disabled={logging}
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-xl
                   text-white transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.97]"
        style={{ background: aega.accentColor }}
      >
        {logging
          ? <><Loader2 size={11} className="animate-spin" /> Logging…</>
          : <><Check size={11} /> {confirmLabel}</>
        }
      </button>

      {learnedAcc && (
        <button
          onClick={() => onConfirm(undefined)}
          disabled={logging}
          className="text-[11px] text-donna-subtle hover:text-donna-text transition-colors px-2 py-1.5"
        >
          Different account
        </button>
      )}

      <button
        onClick={onCancel}
        className="text-[11px] text-donna-subtle hover:text-donna-text transition-colors px-2 py-1.5"
      >
        Cancel
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface CouncilChatProps {
  userId:      string
  displayName?: string
}

export default function CouncilChat({ userId, displayName }: CouncilChatProps) {
  const [messages, setMessages]           = useState<CouncilMessage[]>([])
  const [input, setInput]                 = useState('')
  const [isBusy, setIsBusy]               = useState(false)
  const [typingMembers, setTypingMembers] = useState<MemberId[]>([])
  const [mounted, setMounted]             = useState(false)

  // Expense confirmation state
  const [pendingExpense, setPendingExpense] = useState<PendingExpense | null>(null)
  const [expenseLogging, setExpenseLogging] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const busyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Hydrate ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMessages(loadMessages(userId))
    setMounted(true)
  }, [userId])

  useEffect(() => {
    if (mounted) saveMessages(userId, messages)
  }, [messages, userId, mounted])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingMembers, pendingExpense])

  // ── Input auto-grow ──────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  // ── Add Aega follow-up message ───────────────────────────────────────────────
  const addAegaMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: uid(), role: 'council', memberId: 'aega', content, timestamp: Date.now(),
    }])
  }

  // ── Expense: confirm and log ──────────────────────────────────────────────────
  const handleExpenseConfirm = useCallback(async (accountId?: string) => {
    if (!pendingExpense) return
    setExpenseLogging(true)

    try {
      const res = await fetch('/api/finance/action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          text:      pendingExpense.intent.rawText,
          accountId: accountId ?? pendingExpense.intent.learnedAccount?.accountId ?? undefined,
        }),
      })

      const json = await res.json() as {
        result?: {
          status:      string
          message:     string
          redirectUrl?: string
          accounts?:   AccountChoice[]
        }
        error?: string
      }

      if (!res.ok || json.error) {
        addAegaMessage(`Couldn't log that — ${json.error ?? 'something went wrong. Try again.'}`)
        setPendingExpense(null)
        return
      }

      const result = json.result!

      if (result.status === 'choose_account' && result.accounts?.length) {
        // Need account selection — show chips
        setPendingExpense(prev => prev ? { ...prev, accountChoices: result.accounts } : null)
        return
      }

      // Success — learn the account for next time
      const usedAccountId   = accountId ?? pendingExpense.intent.learnedAccount?.accountId
      const usedAccountName = accountId
        ? (pendingExpense.accountChoices?.find(a => a.id === accountId)?.name ?? '')
        : (pendingExpense.intent.learnedAccount?.accountName ?? '')
      const usedAccountType = accountId
        ? (pendingExpense.accountChoices?.find(a => a.id === accountId)?.type ?? '')
        : (pendingExpense.intent.learnedAccount?.accountType ?? '')

      if (usedAccountId && pendingExpense.intent.category) {
        learnAccount(pendingExpense.intent.category, {
          accountId:   usedAccountId,
          accountName: usedAccountName,
          accountType: usedAccountType,
        })
      }

      // Aega confirms with a short message
      const redirectNote = result.redirectUrl ? ` [Open in Vaultr →](${result.redirectUrl})` : ''
      addAegaMessage(`Done.${redirectNote}`)
      setPendingExpense(null)

    } catch {
      addAegaMessage("Couldn't reach Vaultr. Check your connection.")
      setPendingExpense(null)
    } finally {
      setExpenseLogging(false)
    }
  }, [pendingExpense])

  const handleExpensePickAccount = useCallback((id: string, name: string, type: string) => {
    handleExpenseConfirm(id)
  }, [handleExpenseConfirm])

  const handleExpenseCancel = useCallback(() => {
    setPendingExpense(null)
    addAegaMessage("No problem — skipped.")
  }, [])

  // ── Send ──────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isBusy) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    // ── Handle pending expense confirmation via typed text ──────────────────
    if (pendingExpense && !pendingExpense.accountChoices) {
      if (CONFIRM_RE.test(content)) {
        handleExpenseConfirm(pendingExpense.intent.learnedAccount?.accountId)
        return
      }
      if (CANCEL_RE.test(content)) {
        handleExpenseCancel()
        return
      }
    }

    // ── Regular message: detect expense intent before sending ───────────────
    const expenseIntent = detectExpenseIntent(content)

    // Append user message
    const userMsg: CouncilMessage = {
      id: uid(), role: 'user', content, timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsBusy(true)

    // If expense detected, set pending so we show confirm UI after Aega responds
    if (expenseIntent.isExpense) {
      setPendingExpense({ intent: expenseIntent })
    }

    busyTimer.current = setTimeout(() => setIsBusy(false), 45_000)

    try {
      const history = toApiHistory([...messages, userMsg])

      const res = await fetch('/api/council', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: history,
          userId,
          expenseIntent: expenseIntent.isExpense ? expenseIntent : null,
        }),
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
              setMessages(prev => [...prev, {
                id: currentMsgId!, role: 'council', memberId: currentMemberId!,
                content: '', timestamp: Date.now(), isStreaming: true,
              }])
              setTypingMembers(prev => prev.filter(id => id !== currentMemberId))
            }

            else if (event.phase === 'text' && event.text && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev =>
                prev.map(m => m.id === msgId ? { ...m, content: m.content + event.text! } : m)
              )
            }

            else if (event.phase === 'member_end' && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m))
              currentMemberId = null
              currentMsgId    = null
            }

            else if (event.phase === 'done') {
              setTypingMembers([])
              setIsBusy(false)
              if (busyTimer.current) clearTimeout(busyTimer.current)
            }

          } catch { /* malformed SSE */ }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        flush(decoder.decode(value, { stream: true }))
      }

    } catch (err) {
      addAegaMessage(`Something went wrong — ${err instanceof Error ? err.message : 'please try again'}`)
    } finally {
      setTypingMembers([])
      setIsBusy(false)
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
  }, [input, isBusy, messages, userId, pendingExpense, handleExpenseConfirm, handleExpenseCancel])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([])
    setPendingExpense(null)
    saveMessages(userId, [])
  }

  const isEmpty = messages.length === 0

  // ── Find index of last Aega message (for anchoring action bar) ────────────────
  const lastAegaIdx = pendingExpense
    ? [...messages].reverse().findIndex(m => m.memberId === 'aega' && !m.isStreaming)
    : -1
  const lastAegaMsgId = lastAegaIdx >= 0
    ? messages[messages.length - 1 - lastAegaIdx]?.id
    : null

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-donna-border shrink-0">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-donna-subtle" />
          <span className="text-[10px] font-semibold text-donna-subtle uppercase tracking-wider">Council</span>
        </div>
        <MemberPresence compact />
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[10px] text-donna-subtle hover:text-donna-muted transition-colors flex items-center gap-1"
          >
            <Trash2 size={10} />
            Clear
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
                  className="text-left text-[11px] text-donna-muted px-3 py-2 rounded-xl
                             border border-donna-border hover:border-donna-text hover:text-donna-text
                             transition-colors leading-snug">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                <MemberMessage message={msg} userDisplayName={displayName} />

                {/* Expense action bar — anchored right below the last Aega message */}
                {pendingExpense && msg.id === lastAegaMsgId && !isBusy && (
                  <ExpenseActionBar
                    pending={pendingExpense}
                    onConfirm={handleExpenseConfirm}
                    onPickAccount={handleExpensePickAccount}
                    onCancel={handleExpenseCancel}
                    logging={expenseLogging}
                  />
                )}
              </div>
            ))}

            {/* Typing indicators */}
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
        {/* Expense hint */}
        {pendingExpense && !pendingExpense.accountChoices && (
          <p className="text-[10px] text-donna-subtle mb-1.5 px-1">
            Type <strong>yes</strong> to confirm, or <strong>cancel</strong> to skip
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={pendingExpense ? "yes / cancel / or continue…" : "Ask the council anything…"}
            rows={1}
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle
                       bg-transparent outline-none resize-none leading-relaxed py-1"
            style={{ WebkitAppearance: 'none' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isBusy}
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center
                       transition-all disabled:opacity-40"
            style={{ background: input.trim() && !isBusy ? 'var(--c-violet)' : 'var(--c-elevated)' }}
          >
            <Send size={13} style={{ color: input.trim() && !isBusy ? '#fff' : 'var(--c-subtle)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
