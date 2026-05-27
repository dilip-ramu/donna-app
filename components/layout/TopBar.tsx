'use client'

import { usePathname } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import { useCommandPalette } from '@/components/command/CommandPaletteProvider'
import QuickCaptureButton from '@/components/inbox/QuickCaptureButton'

const PAGE_TITLES: Record<string, string> = {
  '/':          'Today',
  '/inbox':     'Inbox',
  '/tasks':     'Tasks',
  '/projects':  'Projects',
  '/calendar':  'Calendar',
  '/ideas':     'Ideas',
  '/meetings':  'Meetings',
  '/documents': 'Documents',
  '/search':    'Search',
  '/settings':  'Settings',
}

export default function TopBar({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const { open } = useCommandPalette()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'Donna'

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-donna-border bg-donna-surface shrink-0">
      <h1 className="flex-1 text-base font-semibold text-donna-text">{title}</h1>

      {/* Search / command */}
      <button
        onClick={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-donna-elevated
                   text-donna-muted hover:text-donna-text transition-colors text-xs"
        aria-label="Open command palette"
      >
        <Search size={13} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center text-[10px] opacity-50 ml-1">⌘K</kbd>
      </button>

      <QuickCaptureButton />
    </header>
  )
}
