import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documents' }

export default function DocumentsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-donna-text mb-1">Documents</h1>
      <p className="text-donna-muted text-sm">Coming in the next phase.</p>
    </div>
  )
}
