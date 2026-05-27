'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MobileChatSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function MobileChatSheet({ open, onClose, children }: MobileChatSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on backdrop tap
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50 flex flex-col md:hidden',
          'bg-donna-surface rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{
          height: '85dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-donna-border" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-donna-subtle hover:text-donna-text transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Content — fills the sheet */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  )
}
