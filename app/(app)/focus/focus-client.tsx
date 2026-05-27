'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { Play, Pause, RotateCcw, Check, ChevronRight, Target, Coffee } from 'lucide-react'
import { Task, Priority } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981', someday: '#9CA3AF',
}

const SESSIONS = [
  { label: '25 min', seconds: 25 * 60, type: 'work' as const },
  { label: '50 min', seconds: 50 * 60, type: 'work' as const },
  { label: '5 min',  seconds:  5 * 60, type: 'break' as const },
  { label: '15 min', seconds: 15 * 60, type: 'break' as const },
]

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

interface Props { inProgress: Task[]; active: Task[] }

export default function FocusClient({ inProgress, active }: Props) {
  const [focusTask, setFocusTask] = useState<Task | null>(inProgress[0] ?? null)
  const [sessionIdx, setSessionIdx] = useState(0)
  const session = SESSIONS[sessionIdx]

  const [timeLeft, setTimeLeft]   = useState(session.seconds)
  const [running, setRunning]     = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [, startTransition]       = useTransition()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset timer when session changes
  useEffect(() => { setTimeLeft(session.seconds); setRunning(false) }, [session.seconds])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0 }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current!)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running])

  const pct = 1 - timeLeft / session.seconds
  const R = 80
  const circ = 2 * Math.PI * R
  const isBreak = session.type === 'break'

  const handleComplete = (id: string) => {
    setCompleted(prev => { const s = new Set(prev); s.add(id); return s })
    startTransition(async () => {
      const { completeTask } = await import('@/lib/actions/tasks')
      await completeTask(id)
    })
  }

  const allTasks = [...inProgress, ...active.filter(t => !inProgress.find(i => i.id === t.id))]

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-semibold text-donna-text flex items-center gap-2">
          <Target size={18} style={{ color: 'var(--c-violet)' }} />
          Focus
        </h1>
        <p className="text-sm text-donna-muted mt-0.5">
          {focusTask ? `Working on — ${focusTask.title}` : 'Pick a task to focus on'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* ── Timer card ── */}
        <div className="page-card flex flex-col items-center py-8 gap-6">

          {/* Session type pills */}
          <div className="flex gap-2">
            {SESSIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSessionIdx(i); setRunning(false) }}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors',
                  sessionIdx === i
                    ? 'text-white'
                    : 'bg-donna-elevated text-donna-muted hover:text-donna-text',
                )}
                style={sessionIdx === i ? { background: isBreak ? '#10B981' : 'var(--c-violet)' } : {}}
              >
                {s.type === 'break' && <Coffee size={11} />}
                {s.label}
              </button>
            ))}
          </div>

          {/* SVG ring timer */}
          <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
            <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
              <circle cx="100" cy="100" r={R} fill="none" stroke="var(--c-border)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
                stroke={isBreak ? '#10B981' : 'var(--c-violet)'}
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums text-donna-text">
                {fmtTime(timeLeft)}
              </span>
              <span className="text-[11px] text-donna-muted mt-1 capitalize">{session.type}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setTimeLeft(session.seconds); setRunning(false) }}
              className="w-10 h-10 rounded-full bg-donna-elevated flex items-center justify-center
                         text-donna-muted hover:text-donna-text transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setRunning(r => !r)}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white
                         transition-all active:scale-95 shadow-lg"
              style={{ background: isBreak ? '#10B981' : 'var(--c-violet)' }}
            >
              {running ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
            </button>
            {timeLeft === 0 && (
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <Check size={16} className="text-[#10B981]" />
              </div>
            )}
          </div>

          {/* Focused on */}
          {focusTask && (
            <div
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-center"
              style={{ background: 'var(--c-violet-bg)', color: 'var(--c-violet)' }}
            >
              🎯 {focusTask.title}
            </div>
          )}
        </div>

        {/* ── Task list ── */}
        <div className="page-card flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-donna-border shrink-0">
            <h2 className="text-sm font-semibold text-donna-text">Pick your focus</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">Tap to focus, check to complete</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1">
            {allTasks.length === 0 ? (
              <div className="py-10 text-center">
                <Check size={24} className="mx-auto mb-2" style={{ color: '#10B981' }} />
                <p className="text-sm text-donna-muted">No tasks — you're free!</p>
              </div>
            ) : allTasks.filter(t => !completed.has(t.id)).map(task => {
              const isFocus = focusTask?.id === task.id
              const isIP    = task.status === 'in_progress'
              return (
                <div
                  key={task.id}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer',
                    isFocus ? 'bg-donna-violet-light' : 'hover:bg-donna-elevated',
                  )}
                  onClick={() => setFocusTask(task)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); handleComplete(task.id) }}
                    className="shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      width: 18, height: 18,
                      borderColor: isFocus ? 'var(--c-violet)' : PRIORITY_COLOR[task.priority] ?? '#D1D5DB',
                    }}
                    aria-label="Complete"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isFocus ? 'font-medium text-donna-violet' : 'text-donna-text')}>
                      {task.title}
                    </p>
                    {isIP && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--c-violet)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-violet)' }} />
                        In progress
                      </span>
                    )}
                  </div>
                  {isFocus && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--c-violet)' }} />}
                </div>
              )
            })}
          </div>

          <div className="px-5 py-3 border-t border-donna-border shrink-0">
            <Link href="/tasks" className="text-xs font-medium text-donna-violet hover:underline flex items-center gap-1">
              All tasks <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
