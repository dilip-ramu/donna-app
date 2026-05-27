import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Meetings' }

export default function MeetingsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-donna-text mb-1">Meetings</h1>
      <p className="text-donna-muted text-sm">Coming in the next phase.</p>
    </div>
  )
}
