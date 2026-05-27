'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InboxCaptureProps {
  onSubmit: (content: string) => void
  isSubmitting?: boolean
  autoFocus?: boolean
  placeholder?: string
}

export default function InboxCapture({
  onSubmit,
  isSubmitting = false,
  autoFocus = true,
  placeholder = "What's on your mind? Task, idea, meeting, anything...",
}: InboxCaptureProps) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isSubmitting) return
    onSubmit(trimmed)
    setValue('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.focus()
    }
  }

  function toggleVoice() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setValue(prev => prev ? `${prev} ${transcript}` : transcript)
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const hasContent = value.trim().length > 0

  return (
    <div className={cn(
      'donna-surface flex items-end gap-2 p-3 transition-colors',
      hasContent && 'border-donna-gold/30'
    )}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 bg-transparent text-donna-text placeholder:text-donna-muted
                   text-sm outline-none resize-none leading-relaxed min-h-[24px] max-h-40"
        disabled={isSubmitting}
      />

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Voice button */}
        <button
          onClick={toggleVoice}
          type="button"
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isRecording
              ? 'text-red-400 bg-red-400/10 animate-pulse'
              : 'text-donna-muted hover:text-donna-text hover:bg-donna-elevated'
          )}
          aria-label={isRecording ? 'Stop recording' : 'Start voice capture'}
        >
          {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
        </button>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isSubmitting}
          type="button"
          className={cn(
            'p-1.5 rounded-md transition-all',
            hasContent && !isSubmitting
              ? 'text-donna-bg bg-donna-gold hover:bg-donna-gold/90'
              : 'text-donna-muted bg-donna-elevated opacity-40 cursor-not-allowed'
          )}
          aria-label="Submit"
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  )
}
