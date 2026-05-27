import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface DashboardGridProps {
  children: ReactNode
  className?: string
}

/**
 * Fluid 3-column CSS Grid dashboard container.
 * Uses auto-fit + minmax so it naturally reflows as the window shrinks,
 * with clamp()-based gap for smooth fluid spacing.
 */
export default function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={cn('flex-1 min-h-0 grid', className)}
      style={{
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 'clamp(12px, 1.5vw, 16px)',
        // On narrower viewports the CSS grid cols are overridden by the
        // responsive classes applied from the parent page
      }}
    >
      {children}
    </div>
  )
}

/** A single column in the 3-column grid — stacks two cards vertically */
export function GridColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex flex-col min-h-0', className)}
      style={{ gap: 'clamp(12px, 1.5vw, 16px)' }}
    >
      {children}
    </div>
  )
}
