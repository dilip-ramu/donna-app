'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Sync with whatever the server-side script set on <html>
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('donna-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('donna-theme', 'light')
    }
  }

  return { dark, toggle }
}

interface ThemeToggleProps {
  /** compact = just the icon button (sidebar); full = pill with label (settings) */
  variant?: 'compact' | 'full'
  className?: string
}

export default function ThemeToggle({ variant = 'compact', className }: ThemeToggleProps) {
  const { dark, toggle } = useTheme()

  if (variant === 'full') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors text-left',
          'hover:bg-donna-elevated',
          className,
        )}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: dark ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.12)', color: dark ? '#8B5CF6' : '#F59E0B' }}
        >
          {dark ? <Moon size={15} /> : <Sun size={15} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-donna-text leading-none">
            {dark ? 'Dark mode' : 'Light mode'}
          </p>
          <p className="text-[11px] text-donna-muted mt-0.5">
            {dark ? 'Click to switch to light' : 'Click to switch to dark'}
          </p>
        </div>
        {/* Toggle pill */}
        <div
          className="relative w-10 h-5.5 rounded-full shrink-0 transition-colors"
          style={{
            width: 40, height: 22,
            background: dark ? 'var(--c-violet)' : 'var(--c-border)',
          }}
        >
          <div
            className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-donna-surface shadow-sm transition-all duration-200"
            style={{ width: 18, height: 18, top: 2, left: dark ? 20 : 2 }}
          />
        </div>
      </button>
    )
  }

  // Compact: icon-only button for sidebar
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
        'text-donna-muted hover:text-donna-text hover:bg-donna-elevated',
        className,
      )}
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun size={14} strokeWidth={1.8} /> : <Moon size={14} strokeWidth={1.8} />}
    </button>
  )
}
