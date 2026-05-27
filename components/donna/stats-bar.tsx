import { CheckCircle2, AlertTriangle, Clock, Inbox, FolderOpen } from 'lucide-react'

interface StatsBarProps {
  tasksToday: number
  completedToday: number
  overdueCount: number
  inboxCount: number
  activeProjects: number
}

export default function StatsBar({
  tasksToday, completedToday, overdueCount, inboxCount, activeProjects,
}: StatsBarProps) {
  const completionRate = tasksToday > 0
    ? Math.round((completedToday / (tasksToday + completedToday)) * 100)
    : 0

  const stats = [
    {
      label: 'Today',
      value: tasksToday,
      sub: `${completedToday} done`,
      icon: Clock,
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      valueColor: '#111827',
      progress: tasksToday + completedToday > 0
        ? (completedToday / (tasksToday + completedToday))
        : 0,
      progressColor: '#7C3AED',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      sub: overdueCount === 0 ? 'All on track' : 'need action',
      icon: AlertTriangle,
      iconColor: overdueCount > 0 ? '#EF4444' : '#9CA3AF',
      iconBg: overdueCount > 0 ? '#FEF2F2' : '#F9FAFB',
      valueColor: overdueCount > 0 ? '#EF4444' : '#111827',
      progress: null,
      progressColor: '#EF4444',
    },
    {
      label: 'Inbox',
      value: inboxCount,
      sub: inboxCount === 0 ? 'Cleared' : 'to process',
      icon: Inbox,
      iconColor: '#F59E0B',
      iconBg: '#FFFBEB',
      valueColor: '#111827',
      progress: null,
      progressColor: '#F59E0B',
    },
    {
      label: 'Projects',
      value: activeProjects,
      sub: 'active',
      icon: FolderOpen,
      iconColor: '#3B82F6',
      iconBg: '#EFF6FF',
      valueColor: '#111827',
      progress: null,
      progressColor: '#3B82F6',
    },
  ] as const

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 shrink-0"
      style={{ gap: 'clamp(8px, 1vw, 12px)', marginBottom: 'clamp(12px, 1.5vw, 20px)' }}
    >
      {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg, valueColor, progress, progressColor }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white
                     border border-[#F0F0F5] transition-shadow
                     hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconBg }}
          >
            <Icon size={17} style={{ color: iconColor }} strokeWidth={1.8} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold leading-none tabular-nums" style={{ color: valueColor }}>
                {value}
              </p>
              <p className="text-[10px] text-[#9CA3AF] truncate">{sub}</p>
            </div>
            <p className="text-[11px] text-[#C4C4CC] mt-0.5 truncate">{label}</p>
          </div>

          {/* Progress bar (Today card only) */}
          {progress !== null && (
            <div className="shrink-0 ml-auto pl-1">
              <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                <circle cx="14" cy="14" r="10" fill="none" stroke="#F0F0F5" strokeWidth="3" />
                <circle
                  cx="14" cy="14" r="10" fill="none"
                  stroke={progressColor} strokeWidth="3"
                  strokeDasharray={`${62.83}`}
                  strokeDashoffset={`${62.83 * (1 - (progress as number))}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
