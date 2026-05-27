import { Target } from 'lucide-react'

interface DashboardHeaderProps {
  displayName: string
  tagline: string
  taglineSub: string
}

export default function DashboardHeader({ displayName, tagline, taglineSub }: DashboardHeaderProps) {
  // Initials avatar
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex items-start justify-between mb-6">
      {/* Left: greeting + tagline */}
      <div>
        <p className="text-base text-donna-muted font-medium flex items-center gap-1.5">
          Good morning,{' '}
          <span
            className="text-donna-text text-xl"
            style={{ fontFamily: 'var(--font-script), cursive' }}
          >
            {displayName}
          </span>
          <span className="text-base">✨</span>
        </p>
        <h1 className="text-3xl font-bold text-donna-text mt-1 leading-tight">{tagline}</h1>
        <p className="text-sm text-donna-muted mt-1">{taglineSub}</p>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 shrink-0 mt-1">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     text-white transition-all hover:opacity-90"
          style={{ background: '#111827' }}
        >
          <Target size={12} />
          Focus
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     text-donna-text border border-donna-border hover:bg-donna-elevated transition-all"
        >
          ☀ Light
        </button>
        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)' }}
          title={displayName}
        >
          {initial}
        </div>
      </div>
    </div>
  )
}
