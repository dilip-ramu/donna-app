'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, RotateCcw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getGreeting } from '@/lib/utils/date'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DonnaChatProps {
  displayName: string
  userId: string
}

const SUGGESTED_PROMPTS = [
  { icon: '🎯', label: 'What should I focus on today?' },
  { icon: '📋', label: 'Summarize my open tasks' },
  { icon: '⚠️', label: "What's overdue?" },
  { icon: '🧠', label: 'Add something to memory' },
]

export default function DonnaChat({ displayName, userId }: DonnaChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setShowSuggestions(false)

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = '20px'

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userId,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Failed to connect')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulated += parsed.text
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                ))
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "I'm having trouble connecting right now. Please try again." }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [messages, userId, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setShowSuggestions(true)
    setInput('')
  }

  const greeting = getGreeting(displayName)

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-donna-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
            style={{ background: 'linear-gradient(135deg, #E11D48 0%, #9333EA 100%)' }}
          >
            D
          </div>
          <div>
            <p className="text-sm font-semibold text-donna-text leading-none">Donna</p>
            <p className="text-[10px] text-donna-muted mt-0.5 leading-none flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
              online
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 text-donna-muted hover:text-donna-text hover:bg-donna-elevated rounded-md transition-colors"
            title="Clear conversation"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full min-h-0">

            {/* Empty-state greeting */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #E11D48 0%, #9333EA 100%)' }}
              >
                <Sparkles size={20} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-donna-text mb-1">{greeting}</p>
              <p className="text-xs text-donna-muted leading-relaxed max-w-[200px]">
                Ask me anything — tasks, calendar, ideas, or just think out loud.
              </p>
            </div>

            {/* Suggestion chips */}
            {showSuggestions && (
              <div className="space-y-1.5 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-donna-muted px-0.5 mb-2">
                  Try asking
                </p>
                {SUGGESTED_PROMPTS.map(({ icon, label }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(label)}
                    className="w-full text-left flex items-center justify-between gap-2
                               text-xs text-donna-text bg-donna-elevated hover:bg-donna-border/50
                               border border-donna-border rounded-xl px-3 py-2 transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      {label}
                    </span>
                    <ChevronRight size={11} className="text-donna-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]
                               text-white shrink-0 mt-1 mr-2 self-start"
                    style={{ background: 'linear-gradient(135deg, #E11D48 0%, #9333EA 100%)' }}
                  >
                    D
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    message.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-donna-surface border border-donna-border text-donna-text rounded-bl-sm'
                  )}
                  style={message.role === 'user' ? {
                    background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  } : {}}
                >
                  {message.role === 'assistant' && message.content === '' ? (
                    <div className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-donna-muted/60 animate-bounce"
                        style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-donna-muted/60 animate-bounce"
                        style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-donna-muted/60 animate-bounce"
                        style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 px-3 pb-4 pt-2 border-t border-donna-border">
        <div
          className="flex gap-2 items-end bg-donna-surface border border-donna-border rounded-xl px-3 py-2 transition-all"
          style={{ outline: 'none' }}
          onFocus={(e) => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 0 2px rgba(225,29,72,0.15)'
            el.style.borderColor = 'rgba(225,29,72,0.35)'
          }}
          onBlur={(e) => {
            const el = e.currentTarget
            if (!el.contains(e.relatedTarget as Node)) {
              el.style.boxShadow = ''
              el.style.borderColor = ''
            }
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Donna…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-xs text-donna-text placeholder:text-donna-muted
                       outline-none min-h-[20px] max-h-[120px] leading-5 disabled:opacity-60"
            style={{ height: '20px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all mb-0.5',
              input.trim() && !isStreaming
                ? 'text-white hover:opacity-90 active:scale-95'
                : 'bg-donna-elevated text-donna-muted cursor-not-allowed'
            )}
            style={input.trim() && !isStreaming ? {
              background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
            } : {}}
          >
            <Send size={11} />
          </button>
        </div>
        <p className="text-[10px] text-donna-muted text-center mt-1.5">↵ send · shift+↵ newline</p>
      </div>
    </div>
  )
}
