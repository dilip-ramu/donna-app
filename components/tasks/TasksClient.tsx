'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import type { Task, Priority } from '@/lib/types'

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0, high: 1, medium: 2, low: 3, someday: 4,
}

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)

  function onTaskCreated(task: Task) {
    setTasks(prev => [task, ...prev])
    setShowForm(false)
  }

  const sorted = [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pDiff !== 0) return pDiff
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  const active   = sorted.filter(t => t.status !== 'someday' && t.priority !== 'someday')
  const someday  = sorted.filter(t => t.priority === 'someday')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-donna-text">Tasks</h1>
          <p className="text-donna-muted text-sm mt-0.5">{active.length} active</p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-donna-gold
                     text-donna-bg text-sm font-medium hover:bg-donna-gold/90 transition-colors"
        >
          <Plus size={14} />
          New task
        </button>
      </div>

      {showForm && (
        <TaskForm onCreated={onTaskCreated} onCancel={() => setShowForm(false)} />
      )}

      {active.length > 0 ? (
        <section>
          <div className="space-y-0.5">
            {active.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : !showForm && (
        <div className="py-16 text-center">
          <p className="text-donna-muted text-sm">No active tasks.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-donna-gold text-sm hover:underline"
          >
            Add your first task
          </button>
        </div>
      )}

      {someday.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-donna-muted mb-3 font-medium">
            Someday · {someday.length}
          </h2>
          <div className="space-y-0.5 opacity-60">
            {someday.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
