import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface DashboardCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export default function DashboardCard({ children, className, style }: DashboardCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col flex-1 min-h-0 overflow-hidden',
        'rounded-2xl border transition-all duration-200',
        'bg-donna-surface border-donna-border',
        'shadow-[0_1px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]',
        'hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
        'dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex flex-col flex-1 min-h-0 overflow-hidden', className)}
      style={{ padding: 'clamp(14px, 2vw, 20px)' }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 shrink-0">
      <h2 className="text-[0.9375rem] font-semibold text-donna-text leading-none">{title}</h2>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </div>
  )
}

export function CardList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto min-h-0 -mx-0.5 px-0.5', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-3 pt-2 border-t border-donna-border shrink-0', className)}>
      {children}
    </div>
  )
}
