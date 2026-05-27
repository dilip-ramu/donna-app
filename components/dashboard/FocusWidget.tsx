import Link from 'next/link'
import { Clock, Zap, Coffee, ChevronRight } from 'lucide-react'

const FOCUS_TIPS = [
  { icon: Clock,  title: 'Deep work in the morning', sub: 'Your energy is at its best' },
  { icon: Zap,    title: 'Avoid context switching',  sub: 'Batch similar tasks' },
  { icon: Coffee, title: 'Take breaks',              sub: 'Sustain your focus' },
]

// Rotating quote — in a real app this could come from a DB or AI
const QUOTE = {
  text: 'Protect your time.\nIt protects your life.',
}

export default function FocusWidget() {
  return (
    <div className="donna-card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-donna-text">What to focus on</h2>
      </div>

      {/* Quote block */}
      <div
        className="rounded-xl px-4 py-4 mb-4"
        style={{ background: '#EDE9FE' }}
      >
        <span className="text-3xl leading-none font-serif text-donna-violet/40 select-none">&ldquo;</span>
        <p className="text-base font-semibold text-donna-violet leading-snug -mt-2 whitespace-pre-line">
          {QUOTE.text}
        </p>
      </div>

      {/* Tips — flex-1 so this area grows and the footer pins to bottom */}
      <ul className="flex-1 space-y-3 overflow-y-auto min-h-0">
        {FOCUS_TIPS.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-donna-elevated flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={13} className="text-donna-muted" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-medium text-donna-text leading-none">{title}</p>
              <p className="text-[11px] text-donna-muted mt-0.5">{sub}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/focus"
        className="flex items-center gap-1 mt-4 text-xs font-medium text-donna-violet hover:underline"
      >
        See all focus notes <ChevronRight size={12} />
      </Link>
    </div>
  )
}
