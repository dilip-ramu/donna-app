import { Task } from '@/lib/types'

interface DonnaBriefingProps {
  displayName: string
  tasksToday: number
  overdueCount: number
  completedToday: number
  inboxCount: number
  topTask?: Task | null
}

function getBriefingLines({
  displayName,
  tasksToday,
  overdueCount,
  completedToday,
  inboxCount,
  topTask,
}: DonnaBriefingProps): string[] {
  const lines: string[] = []

  // Opening
  if (completedToday > 0 && tasksToday === 0) {
    lines.push(`You've cleared your task list for today — take a breath, ${displayName}.`)
  } else if (overdueCount === 0 && tasksToday === 0 && inboxCount === 0) {
    lines.push(`Clean slate today — nothing overdue, nothing pending.`)
  } else if (overdueCount > 0) {
    lines.push(
      overdueCount === 1
        ? `1 task is overdue — worth tackling that first.`
        : `${overdueCount} tasks are overdue. Clearing those should be the first move.`
    )
  } else if (tasksToday > 0) {
    lines.push(
      tasksToday === 1
        ? `You have 1 task on your list for today.`
        : `You have ${tasksToday} tasks lined up for today.`
    )
  }

  // Progress
  if (completedToday > 0) {
    lines.push(
      completedToday === 1
        ? `You've already ticked off 1 task — good start.`
        : `${completedToday} tasks done already — solid momentum.`
    )
  }

  // Inbox
  if (inboxCount === 0) {
    lines.push('Inbox is at zero. ✓')
  } else if (inboxCount === 1) {
    lines.push('1 item sitting in your inbox needs a decision.')
  } else if (inboxCount > 1) {
    lines.push(`${inboxCount} inbox items waiting — I'll help sort them when you're ready.`)
  }

  // Top task suggestion
  if (topTask) {
    lines.push(`Top priority right now: "${topTask.title}"`)
  }

  // Fallback if nothing interesting
  if (lines.length === 0) {
    lines.push(`Everything looks quiet. A good day to get ahead of the week.`)
  }

  return lines.slice(0, 3) // cap at 3 lines to keep it tight
}

export default function DonnaBriefing(props: DonnaBriefingProps) {
  const lines = getBriefingLines(props)

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-donna-border bg-donna-surface"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {/* Subtle rose glow in top-left */}
      <div
        className="absolute -top-6 -left-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-start gap-3.5 px-4 py-4">
        {/* Donna avatar */}
        <div
          className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm text-white shadow-sm mt-0.5"
          style={{ background: 'linear-gradient(135deg, #E11D48 0%, #9333EA 100%)' }}
        >
          D
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold text-donna-text leading-none">Donna</p>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(225,29,72,0.08)', color: '#E11D48' }}
            >
              your briefing
            </span>
          </div>

          {/* Briefing lines */}
          <div className="space-y-1">
            {lines.map((line, i) => (
              <p
                key={i}
                className="text-sm leading-snug"
                style={{ color: i === 0 ? '#1C1917' : '#78716C' }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 shrink-0 self-start mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-donna-muted hidden sm:inline">live</span>
        </div>
      </div>

      {/* Rose bottom accent line */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, #E11D48 0%, rgba(225,29,72,0.1) 60%, transparent 100%)' }}
      />
    </div>
  )
}
