'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, Loader2, CheckCircle2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

type CaptureState = 'idle' | 'saving' | 'processing' | 'done' | 'error'

interface CaptureResult {
  category: string
  promoted_to: string | null
}

const CATEGORY_ICONS: Record<string, string> = {
  task:     '✓',
  idea:     '💡',
  note:     '📝',
  memory:   '🧠',
  reminder: '⏰',
  meeting:  '📅',
}

const CATEGORY_LABELS: Record<string, string> = {
  task:     'Added to tasks',
  idea:     'Saved as idea',
  note:     'Saved as note',
  memory:   'Saved to memory',
  reminder: 'Reminder set',
  meeting:  'Saved as meeting',
}

async function saveAndProcess(content: string): Promise<{ itemId: string }> {
  const res = await fetch('/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('Failed to save')
  return res.json()
}

async function pollForResult(itemId: string, maxMs = 8000): Promise<CaptureResult | null> {
  const supabase = createClient()
  const deadline = Date.now() + maxMs
  const interval = 600

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('inbox_items')
      .select('status, promoted_to, ai_metadata')
      .eq('id', itemId)
      .single() as {
        data: { status: string; promoted_to: string | null; ai_metadata: { category?: string } | null } | null
      }

    if (data && data.status === 'processed') {
      return {
        category: data.ai_metadata?.category ?? 'note',
        promoted_to: data.promoted_to,
      }
    }
  }
  return null // timed out — AI might still be processing
}

export default function QuickCapture() {
  const [value, setValue] = useState('')
  const [state, setState] = useState<CaptureState>('idle')
  const [result, setResult] = useState<CaptureResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetAfter = useCallback((ms: number) => {
    setTimeout(() => {
      setState('idle')
      setResult(null)
      textareaRef.current?.focus()
    }, ms)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!value.trim() || state !== 'idle') return

    setState('saving')
    const content = value.trim()
    setValue('')
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = '22px'

    try {
      const { itemId } = await saveAndProcess(content)
      setState('processing')

      const res = await pollForResult(itemId)
      setResult(res)
      setState('done')
      resetAfter(4000)
    } catch {
      setState('error')
      resetAfter(3000)
    }
  }, [value, state, resetAfter])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isDisabled = state !== 'idle'

  return (
    <div className="donna-card p-4">
      <div className="widget-header">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-donna-gold" />
          <h2 className="text-sm font-semibold text-donna-text">Quick Capture</h2>
        </div>
        <span className="text-[10px] text-donna-muted bg-donna-elevated px-1.5 py-0.5 rounded-full">
          Donna will sort it out
        </span>
      </div>

      <div className={cn(
        'flex items-end gap-2 bg-donna-bg border rounded-lg px-3 py-2.5 transition-all',
        !isDisabled && value
          ? 'border-donna-gold/40 ring-2 ring-donna-gold/15'
          : 'border-donna-border'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            setValue(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Task, idea, note, anything — just type it…"
          rows={1}
          disabled={isDisabled}
          className="flex-1 resize-none bg-transparent text-sm text-donna-text placeholder:text-donna-muted
                     outline-none min-h-[22px] max-h-[100px] leading-snug disabled:opacity-50"
          style={{ height: '22px' }}
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isDisabled}
          className={cn(
            'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mb-0.5',
            value.trim() && !isDisabled
              ? 'bg-donna-gold text-white hover:bg-donna-gold/90 active:scale-95'
              : 'bg-donna-elevated text-donna-muted cursor-not-allowed'
          )}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Status feedback */}
      <div className="mt-2 min-h-[18px]">
        {state === 'saving' && (
          <p className="text-xs text-donna-muted flex items-center gap-1.5 animate-fade-in">
            <Loader2 size={11} className="animate-spin" />
            Saving…
          </p>
        )}
        {state === 'processing' && (
          <p className="text-xs text-donna-muted flex items-center gap-1.5 animate-fade-in">
            <Loader2 size={11} className="animate-spin text-donna-gold" />
            Donna is categorizing…
          </p>
        )}
        {state === 'done' && result && (
          <p className="text-xs text-green-700 flex items-center gap-1.5 animate-fade-in font-medium">
            <CheckCircle2 size={12} />
            {CATEGORY_ICONS[result.category] ?? '✓'} {CATEGORY_LABELS[result.category] ?? 'Saved'}
          </p>
        )}
        {state === 'done' && !result && (
          <p className="text-xs text-donna-muted flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 size={12} className="text-green-600" />
            Captured — Donna will sort it shortly
          </p>
        )}
        {state === 'error' && (
          <p className="text-xs text-red-500 animate-fade-in">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
