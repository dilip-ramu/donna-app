'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Donna error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 bg-donna-bg">
      <div className="max-w-lg w-full rounded-2xl border border-donna-border bg-donna-surface p-6">
        <h2 className="text-sm font-semibold text-donna-text mb-1">Something went wrong</h2>
        <p className="text-xs text-donna-muted mb-4">
          {error?.message ?? 'Unknown error'}
        </p>
        <pre className="text-[10px] text-donna-subtle bg-donna-elevated rounded-xl p-3 overflow-x-auto whitespace-pre-wrap mb-4">
          {error?.stack ?? 'No stack trace'}
        </pre>
        <button
          onClick={reset}
          className="text-xs font-medium px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--c-violet)' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
