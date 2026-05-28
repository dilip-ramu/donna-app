import Link from 'next/link'
import { Clock, Zap, Coffee, ChevronRight } from 'lucide-react'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'

const FOCUS_TIPS = [
  { icon: Clock,  title: 'Deep work in the morning', sub: 'Your energy is at its best' },
  { icon: Zap,    title: 'Avoid context switching',  sub: 'Batch similar tasks' },
  { icon: Coffee, title: 'Take breaks',              sub: 'Sustain your focus' },
]

const QUOTE = {
  text: 'Protect your time.\nIt protects your life.',
}

export default function FocusCard() {
  return (
    <DashboardCard>
      <CardBody>
        <CardHeader title="What to focus on" />

        {/* Quote block */}
        <div
          className="rounded-xl px-4 py-4 mb-4 shrink-0"
          style={{ background: 'var(--c-violet-bg)' }}
        >
          <span
            className="leading-none font-serif select-none block"
            style={{ fontSize: '1.875rem', color: 'rgba(124,58,237,0.4)' }}
          >
            &ldquo;
          </span>
          <p
            className="font-semibold text-[#7C3AED] leading-snug -mt-2 whitespace-pre-line"
            style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' }}
          >
            {QUOTE.text}
          </p>
        </div>

        {/* Tips */}
        <CardList>
          <ul className="space-y-3">
            {FOCUS_TIPS.map(({ icon: Icon, title, sub }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-donna-elevated flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-donna-muted" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-medium text-donna-text leading-none">{title}</p>
                  <p className="text-[11px] text-donna-subtle mt-0.5">{sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardList>

        <CardFooter>
          <Link
            href="/focus"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            See all focus notes <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
