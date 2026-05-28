'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, Users } from 'lucide-react'
import MemberMessage from './member-message'
import TypingIndicator from './typing-indicator'
import MemberPresence from './member-presence'
import { getMember } from '@/services/council/member-registry'
import type { CouncilMessage } from '@/types/council/message'
import type { ApiCouncilMessage } from '@/types/council/message'
import type { MemberId } from '@/types/council/member'
import type { StreamEvent } from '@/types/council/routing'

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY   = (userId: string) => `donna_council_${userId}`
const MAX_STORED    = 60
const MAX_API_HISTORY = 20

function loadMessages(userId: string): CouncilMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveMessages(userId: string, messages: CouncilMessage[]) {
  try {
    const trimmed = messages.slice(-MAX_STORED)
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(trimmed))
  } catch { /* quota */ }
}

// ── API History Builder ────────────────────────────────────────────────────────
// Converts CouncilMessage[] → ApiCouncilMessage[] for the API route.
// Council messages (assistant turns) are prefixed with member name.

function toApiHistory(messages: CouncilMessage[]): ApiCouncilMessage[] {
  return messages.slice(-MAX_API_HISTORY).map(m => {
    if (m.role === 'user') return { role: 'user' as const, content: m.content }
    const member = m.memberId ? getMember(m.memberId) : null
    const prefix = member ? `[${member.name}]: ` : ''
    return { role: 'assistant' as const, content: `${prefix}${m.content}` }
  })
}

// ── Unique ID ──────────────────────────────────────────────────────────────────

let _seq = 0
function uid() { return `${Date.now()}-${++_seq}` }

// ── Suggested Prompts ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What's on my plate today?",
  "How should I plan my next launch?",
  "What are my pending recoverables?",
  "Help me think through my priorities this week",
]

// ── Component ──────────────────────────────────────────────────────────────────

interface CouncilChatProps {
  userId: string
}

export default function CouncilChat({ userId }: CouncilChatProps) {
  const [messages, setMessages]         = useState<CouncilMessage[]>([])
  const [input, setInput]               = useState('')
  const [isBusy, setIsBusy]             = useState(false)
  const [typingMembers, setTypingMembers] = useState<MemberId[]>([])
  const [mounted, setMounted]           = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const busyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    setMessages(loadMessages(userId))
    setMounted(true)
  }, [userId])

  // ── Persist on change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mounted) saveMessages(userId, messages)
  }, [messages, userId, mounted])

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingMembers])

  // ── Auto-grow textarea ──────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isBusy) return

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    // Append user message
    const userMsg: CouncilMessage = {
      id: uid(), role: 'user', content, timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsBusy(true)

    // Safety timeout
    busyTimer.current = setTimeout(() => setIsBusy(false), 45_000)

    try {
      const history = toApiHistory([...messages, userMsg])

      const res = await fetch('/api/council', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, userId }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      // Active streaming state
      let currentMemberId: MemberId | null = null
      let currentMsgId: string | null = null

      const flushBuffer = (data: string) => {
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

              // Add empty message for this member (will stream into it)
              setMessages(prev => [
                ...prev,
                {
                  id: currentMsgId!,
                  role: 'council',
                  memberId: currentMemberId!,
                  content: '',
                  timestamp: Date.now(),
                  isStreaming: true,
                },
              ])

              // Show remaining queued members as "typing"
              // (update typing list to exclude the now-speaking one)
              setTypingMembers(prev => prev.filter(id => id !== currentMemberId))
            }

            else if (event.phase === 'text' && event.text && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev =>
                prev.map(m =>
                  m.id === msgId
                    ? { ...m, content: m.content + event.text! }
                    : m
                )
              )
            }

            else if (event.phase === 'member_end' && currentMsgId) {
              const msgId = currentMsgId
              setMessages(prev =>
                prev.map(m =>
                  m.id === msgId ? { ...m, isStreaming: false } : m
                )
              )
              currentMemberId = null
              currentMsgId    = null
            }

            else if (event.phase === 'done') {
              setTypingMembers([])
              setIsBusy(false)
              if (busyTimer.current) clearTimeout(busyTimer.current)
            }

            else if (event.phase === 'error') {
              console.error('[council] stream error:', event.message)
            }

          } catch { /* malformed SSE line */ }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        flushBuffer(decoder.decode(value, { stream: true }))
      }

    } catch (err) {
      const errorMsg: CouncilMessage = {
        id: uid(), role: 'council', memberId: 'donna',
        content: `Something went wrong — ${err instanceof Error ? err.message : 'please try again'}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setTypingMembers([])
      setIsBusy(false)
      if (busyTimer.current) clearTimeout(busyTimer.current)
    }
  }, [input, isBusy, messages, userId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([])
    saveMessages(userId, [])
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">

      {/* Council header */}
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
            {/* Council avatars */}
            <div className="flex items-center gap-1 mt-auto">
              {(['donna', 'professor', 'aega'] as MemberId[]).map((id, i) => {
                const m = getMember(id)
                return (
                  <div
                    key={id}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                    style={{
                      background:  m.accentColor,
                      marginLeft:  i > 0 ? -10 : 0,
                      zIndex:      3 - i,
                      boxShadow:   '0 0 0 2px var(--c-surface)',
                    }}
                  >
                    {m.initial}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-donna-muted text-center max-w-[200px] leading-relaxed">
              Your council is ready.<br />Ask anything — the right people will respond.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-col gap-1.5 w-full mt-auto">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-[11px] text-donna-muted px-3 py-2 rounded-xl
                             border border-donna-border hover:border-donna-text hover:text-donna-text
                             transition-colors leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MemberMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicators for queued members */}
            {typingMembers.map(id => (
              <TypingIndicator key={id} memberId={id} />
            ))}

            {/* Donna typing indicator when busy and no messages streaming yet */}
            {isBusy && typingMembers.length === 0 &&
             !messages.some(m => m.isStreaming) && (
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
            className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle
                       bg-transparent outline-none resize-none leading-relaxed py-1"
            style={{ WebkitAppearance: 'none' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isBusy}
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center
                       transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !isBusy ? 'var(--c-violet)' : 'var(--c-elevated)',
            }}
          >
            <Send
              size={13}
              style={{ color: input.trim() && !isBusy ? '#fff' : 'var(--c-subtle)' }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
