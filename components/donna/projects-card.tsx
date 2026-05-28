import Link from 'next/link'
import { FolderOpen, ChevronRight, Circle } from 'lucide-react'
import DashboardCard, { CardBody, CardHeader, CardList, CardFooter } from './dashboard-card'
import { Project } from '@/lib/types'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
  someday:  '#9CA3AF',
}

// Project-level accent colors (cycling)
const PROJECT_ACCENTS = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
]

interface ProjectWithCounts extends Project {
  task_count?: number
  active_task_count?: number
}

interface ProjectsCardProps {
  projects: ProjectWithCounts[]
}

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round(((total - done) / total) * 100)
  // pct = remaining work; we want completion = (total - active) / total
  const completionPct = total === 0 ? 0 : Math.round(((total - (done)) / total) * 100)
  const finalPct = total === 0 ? 0 : Math.min(100, Math.round(((total - done) / total) * 100))

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-donna-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${100 - finalPct}%`, background: color }}
        />
      </div>
      <span className="text-[9px] text-donna-subtle shrink-0 tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}

export default function ProjectsCard({ projects }: ProjectsCardProps) {
  const active = projects.filter(p => p.status === 'active').slice(0, 6)

  return (
    <DashboardCard>
      <CardBody>
        <CardHeader
          title="Projects"
          right={
            <Link href="/projects" className="text-xs font-medium text-[#7C3AED] hover:underline">
              All →
            </Link>
          }
        />

        <CardList>
          {active.length === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen size={24} className="text-donna-border mx-auto mb-2" />
              <p className="text-sm text-donna-subtle">No active projects</p>
              <Link href="/projects" className="text-xs text-[#7C3AED] hover:underline mt-1 inline-block">
                Create one →
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {active.map((proj, i) => {
                const accent = proj.color ?? PROJECT_ACCENTS[i % PROJECT_ACCENTS.length]
                const total  = proj.task_count ?? 0
                const active_tasks = proj.active_task_count ?? 0
                const done   = total - active_tasks

                return (
                  <li
                    key={proj.id}
                    className="group px-3 py-2.5 rounded-xl hover:bg-donna-elevated transition-colors"
                    style={{ borderLeft: `2.5px solid ${accent}` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {proj.icon ? (
                          <span className="text-sm shrink-0">{proj.icon}</span>
                        ) : (
                          <div
                            className="w-5 h-5 rounded-md shrink-0"
                            style={{ background: accent + '20' }}
                          >
                            <div
                              className="w-full h-full rounded-md flex items-center justify-center"
                            >
                              <Circle size={8} style={{ color: accent, fill: accent }} />
                            </div>
                          </div>
                        )}
                        <p className="text-sm font-medium text-donna-text truncate">{proj.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {active_tasks > 0 && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: accent + '18', color: accent }}
                          >
                            {active_tasks} open
                          </span>
                        )}
                        {total === 0 && (
                          <span className="text-[10px] text-donna-subtle">No tasks</span>
                        )}
                      </div>
                    </div>

                    {total > 0 && (
                      <ProgressBar done={active_tasks} total={total} color={accent} />
                    )}

                    {proj.due_date && (
                      <p className="text-[10px] text-donna-subtle mt-1">
                        Due {new Date(proj.due_date + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardList>

        <CardFooter>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] hover:underline"
          >
            Manage projects <ChevronRight size={12} />
          </Link>
        </CardFooter>
      </CardBody>
    </DashboardCard>
  )
}
