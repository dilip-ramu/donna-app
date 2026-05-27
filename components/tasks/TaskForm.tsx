'use client'

import { useState, useRef, useEffect } from 'react'
import { createTask } from '@/lib/actions/tasks'
import { cn } from '@/lib/utils/cn'
import type { Task, Priority } from '@/lib/types'

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 'critical', label: 'Critical', dot: 'bg-red-400' },
  { value: 'high',     label: 'High',     dot: 'bg-orange-400' },
  { value: 'medium',   label: 'Medium',   dot: 'bg-donna-gold' },
  { value: 'low',      label: 'Low',      dot: 'bg-slate-400' },
  { value: 'someday',  label: 'Someday',  dot: 'bg-donna-muted' },
]

export default function TaskForm({
  onCreated,
  onCancel,
}: {
  onCreated: (task: Task) => void
  onCancel: () => void
}) {
  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate]   = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || loading) return
    setLoading(true)

    const { data, error } = await createTask({
      title: title.trim(),
      priority,
      due_date: dueDate || undefined,
      status: 'active',
    })

    setLoading(false)
    if (data) onCreated(data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="donna-surface p-4 space-y-3 animate-slide-up"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title..."
        className="donna-input w-full text-sm"
        onKeyDown={e => e.key === 'Escape' && onCancel()}
      />

      <div className="flex items-center gap-3 flex-wrap">
        {/* Priority */}
        <div className="flex items-center gap-1">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              title={p.label}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                priority === p.value
                  ? 'bg-donna-elevated text-donna-text'
                  : 'text-donna-muted hover:text-donna-text'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', p.dot)} />
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Due date */}
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="donna-input text-xs py-1"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-donna-muted hover:text-donna-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || loading}
          className="px-4 py-1.5 text-sm bg-donna-gold text-donna-bg font-medium rounded-lg
                     hover:bg-donna-gold/90 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {loading ? 'Adding...' : 'Add task'}
        </button>
      </div>
    </form>
  )
}
