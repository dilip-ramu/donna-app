import {
  format, formatDistanceToNow, isToday, isTomorrow, isYesterday,
  isPast, isFuture, differenceInDays, parseISO, startOfDay,
  endOfDay, startOfWeek, endOfWeek, addDays, isValid
} from 'date-fns'

export function formatRelative(dateStr: string): string {
  const date = parseISO(dateStr)
  if (!isValid(date)) return ''

  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
  if (isYesterday(date)) return 'Yesterday'
  if (isTomorrow(date)) return 'Tomorrow'

  const diff = differenceInDays(new Date(), date)
  if (diff < 7) return format(date, 'EEEE')
  if (diff < 365) return format(date, 'MMM d')
  return format(date, 'MMM d, yyyy')
}

export function formatDueDate(dateStr: string | null): {
  label: string
  isOverdue: boolean
  isToday: boolean
  isSoon: boolean
} {
  if (!dateStr) return { label: '', isOverdue: false, isToday: false, isSoon: false }

  const date = parseISO(dateStr)
  if (!isValid(date)) return { label: '', isOverdue: false, isToday: false, isSoon: false }

  const today = startOfDay(new Date())
  const taskDay = startOfDay(date)
  const diff = differenceInDays(taskDay, today)

  const isOverdue = diff < 0
  const isToday_ = diff === 0
  const isSoon = diff > 0 && diff <= 2

  let label: string
  if (isOverdue) {
    label = diff === -1 ? 'Yesterday' : `${Math.abs(diff)}d overdue`
  } else if (isToday_) {
    label = 'Today'
  } else if (diff === 1) {
    label = 'Tomorrow'
  } else if (diff < 7) {
    label = format(date, 'EEEE')
  } else {
    label = format(date, 'MMM d')
  }

  return { label, isOverdue, isToday: isToday_, isSoon }
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours()
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return name ? `Good ${time}, ${name}.` : `Good ${time}.`
}

export function formatDateHeader(date: Date = new Date()): string {
  return format(date, "EEEE, MMMM d")
}

export function getWeekRange(date: Date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function getDayRange(date: Date = new Date()) {
  return { start: startOfDay(date), end: endOfDay(date) }
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export { parseISO, isValid, isToday, isTomorrow, isPast, isFuture, format, addDays }
