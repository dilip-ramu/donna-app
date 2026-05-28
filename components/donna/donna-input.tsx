'use client'

import { useState, useRef, useCallback } from 'react'
import { Sparkles, Mic, Send, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DonnaInputProps {
  userId: string
}

/**
 * Redesigned bottom AI input bar — premium feel with response bubble.
 */
export default function DonnaInput({ userId }: DonnaInputProps) {
  const [value, setValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const [showResponse, setShowResponse] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(async () => {
    if (!value.trim() || isStreaming) return
    const content = value.trim()
    setValue('')
    setIsStreaming(true)
    setShowResponse(false)
    setLastResponse('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }], userId }),
      })

      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        const lines = decoder.decode(chunk, { stream: true }).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) accumulated += parsed.text
            } catch { /* skip */ }
          }
        }
        setLastResponse(accumulated)
      }
      setShowResponse(true)
    } catch {
      setLastResponse("I'm having trouble connecting right now. Please try again.")
      setShowResponse(true)
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }, [value, userId, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend()
    if (e.key === 'Escape') { setShowResponse(false); setLastResponse('') }
  }

  return (
    <div className="shrink-0 border-t border-donna-border bg-donna-surface">
      {/* Response bubble */}
      {showResponse && lastResponse && (
        <div
          className="mx-6 mt-3 mb-0 rounded-xl border border-[rgba(124,58,237,0.12)]
                     bg-[rgba(124,58,237,0.04)] px-4 py-3 flex items-start gap-2.5"
        >
          <div
            className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          >
            <Sparkles size={10} className="text-white" />
          </div>
          <p className="text-sm text-donna-text leading-relaxed flex-1">{lastResponse}</p>
          <button
            onClick={() => setShowResponse(false)}
            className="text-donna-subtle hover:text-donna-muted shrink-0 transition-colors"
            aria-label="Dismiss response"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="px-6 py-3 flex items-center gap-3">
        {/* Donna icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(147,51,234,0.12))' }}
        >
          <Sparkles
            size={14}
            className={cn('text-[#7C3AED] transition-all', isStreaming && 'animate-pulse')}
          />
        </div>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Donna is thinking…' : 'Ask Donna anything…'}
          disabled={isStreaming}
          className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle
                     bg-transparent outline-none disabled:opacity-60 min-w-0"
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="hidden sm:flex items-center gap-1.5 text-xs text-donna-muted font-medium
                       border border-donna-border rounded-lg px-2.5 py-1.5
                       hover:bg-donna-elevated transition-colors"
            aria-label="Quick add"
          >
            <Plus size={12} />
            Quick add
          </button>

          <button
            className="w-8 h-8 rounded-full border border-donna-border flex items-center justify-center
                       text-donna-muted hover:bg-donna-elevated transition-colors"
            aria-label="Voice input"
          >
            <Mic size={14} />
          </button>

          <button
            onClick={handleSend}
            disabled={!value.trim() || isStreaming}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95',
              value.trim() && !isStreaming
                ? 'text-white shadow-[0_2px_8px_rgba(124,58,237,0.4)]'
                : 'bg-donna-elevated text-donna-subtle cursor-not-allowed'
            )}
            style={value.trim() && !isStreaming ? {
              background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
            } : {}}
            aria-label="Send"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-center text-[10px] text-donna-subtle pb-2 -mt-1">
        {isStreaming ? 'Donna is thinking…' : 'Donna is listening. Type naturally.'}
      </p>
    </div>
  )
}
