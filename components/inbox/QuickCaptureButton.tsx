'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import InboxCapture from './InboxCapture'
import { createInboxItem } from '@/lib/actions/inbox'

export default function QuickCaptureButton() {
  const [open, setOpen] = useState(false)

  // ⌘N shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function handleSubmit(content: string) {
    await createInboxItem(content)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-md
                   bg-donna-gold text-donna-bg hover:bg-donna-gold/90
                   transition-colors"
        aria-label="Quick capture (⌘N)"
        title="Quick capture (⌘N)"
      >
        <Plus size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="donna-surface p-1">
              <div className="flex items-center justify-between px-3 py-2 border-b border-donna-border mb-1">
                <span className="text-xs text-donna-muted uppercase tracking-wider">Quick capture</span>
                <button onClick={() => setOpen(false)} className="text-donna-muted hover:text-donna-text">
                  <X size={14} />
                </button>
              </div>
              <InboxCapture onSubmit={handleSubmit} autoFocus placeholder="Capture anything..." />
            </div>
            <p className="text-center text-[10px] text-donna-muted mt-2">
              Press Enter to capture · Esc to close
            </p>
          </div>
        </div>
      )}
    </>
  )
}
