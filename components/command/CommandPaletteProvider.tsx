'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { Search, CheckSquare, Lightbulb, Calendar, FileText, Home, Inbox } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommandPaletteContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

const QUICK_LINKS = [
  { label: 'Today',     href: '/',          icon: Home },
  { label: 'Inbox',     href: '/inbox',     icon: Inbox },
  { label: 'Tasks',     href: '/tasks',     icon: CheckSquare },
  { label: 'Calendar',  href: '/calendar',  icon: Calendar },
  { label: 'Ideas',     href: '/ideas',     icon: Lightbulb },
  { label: 'Documents', href: '/documents', icon: FileText },
]

export default function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const open  = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  // ⌘K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function navigate(href: string) {
    router.push(href)
    close()
  }

  return (
    <CommandPaletteContext.Provider value={{ open, close, isOpen }}>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={close}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-xl bg-donna-surface border border-donna-border
                       rounded-xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <Command className="flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-donna-border">
                <Search size={16} className="text-donna-muted shrink-0" />
                <Command.Input
                  placeholder="Search or jump to..."
                  className="flex-1 bg-transparent text-donna-text placeholder:text-donna-muted
                             text-sm outline-none"
                  autoFocus
                />
                <kbd className="text-[10px] text-donna-muted bg-donna-elevated px-1.5 py-0.5 rounded">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-donna-muted">
                  No results.
                </Command.Empty>

                <Command.Group
                  heading={
                    <span className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-donna-muted block">
                      Navigate
                    </span>
                  }
                >
                  {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                    <Command.Item
                      key={href}
                      value={label}
                      onSelect={() => navigate(href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                                 text-donna-muted cursor-pointer
                                 aria-selected:bg-donna-elevated aria-selected:text-donna-text
                                 transition-colors"
                    >
                      <Icon size={14} />
                      {label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  )
}
