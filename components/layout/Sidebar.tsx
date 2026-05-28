'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  Home, Inbox, CheckSquare, Calendar, BookMarked,
  Users, Target, FolderOpen, Star, BookOpen, Settings, Sun,
} from 'lucide-react'

const NAV = [
  { href: '/',           label: 'Home',       icon: Home },
  { href: '/inbox',      label: 'Inbox',      icon: Inbox },
  { href: '/tasks',      label: 'Tasks',      icon: CheckSquare },
  { href: '/calendar',   label: 'Calendar',   icon: Calendar },
  { href: '/memory',     label: 'Memory',     icon: BookMarked },
  { href: '/meetings',   label: 'Meetings',   icon: Users },
  { href: '/focus',      label: 'Focus',      icon: Target },
  { href: '/projects',   label: 'Projects',   icon: FolderOpen },
  { href: '/someday',    label: 'Someday',    icon: Star },
  { href: '/references', label: 'References', icon: BookOpen },
]

export default function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-donna-surface border-r border-donna-border select-none">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <span
          className="text-3xl leading-none tracking-wide"
          style={{ fontFamily: 'var(--font-script), cursive', color: '#111827' }}
        >
          Donna
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-donna-violet/[0.08] text-donna-violet'
                  : 'text-donna-muted hover:bg-donna-elevated hover:text-donna-text'
              )}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="px-3 py-2 border-t border-donna-border">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
            pathname === '/settings'
              ? 'bg-donna-violet/[0.08] text-donna-violet'
              : 'text-donna-muted hover:bg-donna-elevated hover:text-donna-text'
          )}
        >
          <Settings size={16} strokeWidth={1.8} />
          Settings
        </Link>
      </div>

      {/* Bottom tagline */}
      <div className="px-5 py-4 flex items-start gap-2">
        <Sun size={12} className="text-donna-muted mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-donna-text leading-snug">Stay calm.</p>
          <p className="text-[11px] text-donna-muted leading-snug">Progress, not perfection.</p>
        </div>
      </div>
    </div>
  )
}
