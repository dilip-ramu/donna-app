import { CheckSquare, AlertCircle, Inbox, Lightbulb } from 'lucide-react'

interface StatsBarProps {
  tasksToday: number
  tasksCompleted: number
  overdue: number
  inboxCount: number
  ideasThisWeek: number
}

interface MetricProps {
  icon: React.ReactNode
  value: number | string
  label: string
  sub: string
  accentColor: string
  valueColor?: string
}

function Metric({ icon, value, label, sub, accentColor, valueColor }: MetricProps) {
  return (
    <div
      className="bg-donna-surface rounded-xl border border-donna-border p-4 flex flex-col gap-3"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[28px] font-semibold leading-none tracking-tight"
          style={{ color: valueColor ?? '#1C1917' }}>
          {value}
        </p>
        <p className="text-xs text-donna-muted mt-1">{label}</p>
      </div>
      <p className="text-[11px] font-medium" style={{ color: accentColor }}>{sub}</p>
    </div>
  )
}

export default function StatsBar({
  tasksToday, tasksCompleted, overdue, inboxCount, ideasThisWeek
}: StatsBarProps) {
  const pct = tasksToday > 0 ? Math.round((tasksCompleted / tasksToday) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric
        icon={<CheckSquare size={15} />}
        value={tasksToday}
        label="Tasks today"
        sub={tasksCompleted > 0 ? `${pct}% complete` : 'not started yet'}
        accentColor="#7C3AED"
      />
      <Metric
        icon={<AlertCircle size={15} />}
        value={overdue}
        label="Overdue"
        sub={overdue > 0 ? 'needs attention' : 'all caught up ✓'}
        accentColor={overdue > 0 ? '#E11D48' : '#059669'}
        valueColor={overdue > 0 ? '#E11D48' : undefined}
      />
      <Metric
        icon={<Inbox size={15} />}
        value={inboxCount}
        label="In inbox"
        sub={inboxCount === 0 ? 'inbox zero 🎉' : 'Donna is sorting'}
        accentColor="#0D9488"
      />
      <Metric
        icon={<Lightbulb size={15} />}
        value={ideasThisWeek}
        label="Ideas this week"
        sub={ideasThisWeek > 0 ? 'keep them coming' : 'capture an idea'}
        accentColor="#D97706"
      />
    </div>
  )
}
