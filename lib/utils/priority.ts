import type { Priority } from '@/lib/types'

export const PRIORITY_CONFIG: Record<Priority, {
  label: string
  color: string
  bgColor: string
  dotColor: string
  order: number
}> = {
  critical: { label: 'Critical', color: 'text-red-400',    bgColor: 'bg-red-400/10',    dotColor: 'bg-red-400',    order: 0 },
  high:     { label: 'High',     color: 'text-orange-400', bgColor: 'bg-orange-400/10', dotColor: 'bg-orange-400', order: 1 },
  medium:   { label: 'Medium',   color: 'text-donna-gold', bgColor: 'bg-donna-gold/10', dotColor: 'bg-donna-gold', order: 2 },
  low:      { label: 'Low',      color: 'text-slate-400',  bgColor: 'bg-slate-400/10',  dotColor: 'bg-slate-400',  order: 3 },
  someday:  { label: 'Someday',  color: 'text-donna-muted', bgColor: 'bg-donna-subtle', dotColor: 'bg-donna-muted', order: 4 },
}

export function sortByPriority<T extends { priority: Priority }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
  )
}

export function getPriorityConfig(priority: Priority) {
  return PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
}
