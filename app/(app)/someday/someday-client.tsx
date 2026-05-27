'use client'

import { useState, useTransition } from 'react'
import { Star, Lightbulb, CheckSquare, Plus, Loader2, Check, ArrowUpRight } from 'lucide-react'
import { Task, Idea } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

type Tab = 'tasks' | 'ideas'

interface Props { tasks: Task[]; ideas: Idea[] }

export default function SomedayClient({ tasks: initTasks, ideas: initIdeas }: Props) {
  const [tab, setTab]       = useState<Tab>('tasks')
  const [tasks, setTasks]   = useState(initTasks)
  const [ideas, setIdeas]   = useState(initIdeas)
  const [input, setInput]   = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const handleAdd = async () => {
    if (!input.trim() || saving) return
    setSaving(true)
    try {
      if (tab === 'tasks') {
        const { createTask } = await import('@/lib/actions/tasks')
        const result = await createTask({ title: input.trim(), priority: 'someday', status: 'active' })
        if (result.data) setTasks(prev => [result.data!, ...prev])
      } else {
        const { createInboxItem } = await import('@/lib/actions/inbox')
        await createInboxItem(`[idea] ${input.trim()}`)
      }
      setInput('')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = (id: string) => {
    setDone(prev => { const s = new Set(prev); s.add(id); return s })
    startTransition(async () => {
      const { completeTask } = await import('@/lib/actions/tasks')
      await completeTask(id)
    })
  }

  const handlePromote = async (task: Task) => {
    startTransition(async () => {
      const { updateTask } = await import('@/lib/actions/tasks')
      await updateTask(task.id, { priority: 'medium' })
      setTasks(prev => prev.filter(t => t.id !== task.id))
    })
  }

  const IDEA_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    raw:       { label: 'Raw',     color: '#F97316', bg: '#FFF7ED' },
    shelved:   { label: 'Shelved', color: '#9CA3AF', bg: 'var(--c-elevated)' },
    refined:   { label: 'Refined', color: '#3B82F6', bg: '#EFF6FF' },
    validated: { label: 'Valid',   color: '#10B981', bg: '#ECFDF5' },
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-donna-text flex items-center gap-2">
          <Star size={18} className="text-[#F59E0B]" />
          Someday
        </h1>
        <p className="text-sm text-donna-muted mt-0.5">
          Things you want to do eventually — without the pressure of today.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-donna-elevated p-1 rounded-xl w-fit">
        {([['tasks', 'Tasks', tasks.length], ['ideas', 'Ideas', ideas.length]] as const).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-donna-surface text-donna-text shadow-sm'
                : 'text-donna-muted hover:text-donna-text',
            )}
          >
            {label}
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
              tab === id ? 'bg-donna-elevated text-donna-muted' : 'text-donna-subtle',
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Quick-add */}
      <div className="page-card flex items-center gap-3 px-4 py-3">
        <Plus size={16} className="text-donna-subtle shrink-0" />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={tab === 'tasks' ? 'Add a someday task…' : 'Capture a someday idea…'}
          className="flex-1 text-sm text-donna-text placeholder:text-donna-subtle bg-transparent outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || saving}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-white
                     disabled:opacity-50 transition-all"
          style={{ background: 'var(--c-violet)' }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Add</>}
        </button>
      </div>

      {/* List */}
      <div className="page-card overflow-hidden">
        {tab === 'tasks' ? (
          <div>
            {tasks.filter(t => !done.has(t.id)).length === 0 ? (
              <div className="py-14 text-center">
                <Star size={28} className="mx-auto mb-3 text-[#F59E0B] opacity-40" />
                <p className="text-sm text-donna-muted">No someday tasks yet.</p>
                <p className="text-[11px] text-donna-subtle mt-1">Things you'll get to… eventually.</p>
              </div>
            ) : (
              <ul className="divide-y divide-donna-border">
                {tasks.filter(t => !done.has(t.id)).map(task => (
                  <li key={task.id}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-donna-elevated transition-colors">
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="shrink-0 w-4.5 h-4.5 rounded-full border-2 border-donna-border
                                 hover:border-[#F59E0B] transition-colors flex items-center justify-center"
                      style={{ width: 18, height: 18 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-donna-text truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-[10px] text-donna-subtle mt-0.5">
                          {new Date(task.due_date + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handlePromote(task)}
                      title="Promote to active"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center
                                 gap-1 text-[10px] font-medium text-donna-violet hover:underline shrink-0"
                    >
                      <ArrowUpRight size={12} /> Activate
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            {ideas.length === 0 ? (
              <div className="py-14 text-center">
                <Lightbulb size={28} className="mx-auto mb-3 text-[#F59E0B] opacity-40" />
                <p className="text-sm text-donna-muted">No someday ideas yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-donna-border">
                {ideas.map(idea => {
                  const s = IDEA_STATUS[idea.status] ?? IDEA_STATUS.raw
                  return (
                    <li key={idea.id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-donna-elevated transition-colors">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-donna-text leading-snug">{idea.title}</p>
                        {idea.description && (
                          <p className="text-[11px] text-donna-muted mt-0.5 line-clamp-2">{idea.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
