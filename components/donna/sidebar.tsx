'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import ThemeToggle from './theme-toggle'
import {
  Home, Inbox, CheckSquare, Calendar, BookMarked,
  Users, Target, FolderOpen, Star, BookOpen, Settings,
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

interface SidebarProps { displayName: string }

export default function Sidebar({ displayName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full w-full bg-donna-surface border-r border-donna-border select-none transition-colors duration-200">

      {/* ── Logo ── */}
      <div className="pt-6 pb-5 shrink-0 md:px-3.5 lg:px-5 flex items-center">
        {/* Collapsed (md): small square icon */}
        <Image
          src="/donna-letter-logo.png"
          alt="Donna"
          width={28}
          height={28}
          className="rounded-lg md:block lg:hidden"
          style={{ objectFit: 'contain' }}
        />
        {/* Expanded (lg): wider logo */}
        <Image
          src="/donna-letter-logo.png"
          alt="Donna"
          width={100}
          height={36}
          className="md:hidden lg:block"
          style={{ objectFit: 'contain', objectPosition: 'left' }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 md:px-2 lg:px-3 space-y-0.5 overflow-y-auto pb-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                'md:justify-center md:gap-0 md:px-2 md:py-2.5',
                'lg:justify-start lg:gap-3 lg:px-3 lg:py-2',
                active
                  ? 'bg-donna-violet-light text-donna-violet'
                  : 'text-donna-muted hover:bg-donna-elevated hover:text-donna-text',
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              <span className="md:hidden lg:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="md:px-2 lg:px-3 py-2 border-t border-donna-border space-y-0.5">
        <div className="flex items-center md:justify-center lg:justify-start md:px-0 lg:px-1 py-1">
          <ThemeToggle variant="compact" />
        </div>
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
            'md:justify-center md:gap-0 md:px-2 md:py-2.5',
            'lg:justify-start lg:gap-3 lg:px-3 lg:py-2',
            pathname === '/settings'
              ? 'bg-donna-violet-light text-donna-violet'
              : 'text-donna-muted hover:bg-donna-elevated hover:text-donna-text',
          )}
        >
          <Settings size={16} strokeWidth={1.8} className="shrink-0" />
          <span className="md:hidden lg:inline">Settings</span>
        </Link>
      </div>

      <div className="md:hidden lg:flex items-center gap-2 px-5 py-4 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: 'var(--c-violet)' }} />
        <p className="text-[11px] text-donna-muted">Progress, not perfection.</p>
      </div>
    </div>
  )
}
