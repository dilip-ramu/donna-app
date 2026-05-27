import Link from 'next/link'
import { Settings } from 'lucide-react'

interface TopbarProps {
  displayName: string
  tagline: string
  taglineSub: string
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFullDate(): string {
  return new Date().toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function Topbar({ displayName, tagline }: TopbarProps) {
  const greeting = getTimeGreeting()
  const initial  = displayName.charAt(0).toUpperCase()

  return (
    <div
      className="flex items-end justify-between shrink-0"
      style={{ marginBottom: 'clamp(12px, 1.5vw, 20px)' }}
    >
      {/* Left */}
      <div>
        <p className="text-[11px] text-donna-muted font-medium uppercase tracking-wide mb-1">
          {getFullDate()}
        </p>

        {/* Full greeting in Dancing Script */}
        <h1
          className="leading-none text-donna-text"
          style={{
            fontFamily: 'var(--font-script), cursive',
            fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 700,
          }}
        >
          {greeting}, {displayName} ✨
        </h1>

        <p className="text-sm text-donna-muted mt-2">{tagline}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5 shrink-0 mb-1">
        <Link
          href="/settings"
          className="w-8 h-8 rounded-xl bg-donna-surface border border-donna-border flex items-center justify-center
                     text-donna-muted hover:text-donna-text hover:border-donna-muted transition-colors"
          aria-label="Settings"
        >
          <Settings size={15} strokeWidth={1.8} />
        </Link>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm text-white select-none"
          style={{ background: 'linear-gradient(135deg, var(--c-violet), #9333EA)' }}
          title={displayName}
        >
          {initial}
        </div>
      </div>
    </div>
  )
}
