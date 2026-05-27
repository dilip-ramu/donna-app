'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task, CreateTaskInput } from '@/lib/types'

export async function createTask(
  input: CreateTaskInput
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: user.id, status: 'active', priority: 'medium', ...input })
    .select('*, project:projects(id,title,color,icon)')
    .single()

  if (error) {
    console.error('[tasks:create]', error)
    return { data: null, error: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id, entity_type: 'task', entity_id: data.id,
    action: 'created', actor: 'user',
  })

  revalidatePath('/tasks')
  revalidatePath('/')
  return { data: data as Task, error: null }
}

export async function updateTask(
  id: string,
  updates: Partial<CreateTaskInput & { status: Task['status']; completed_at: string }>
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, project:projects(id,title,color,icon)')
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/tasks')
  revalidatePath('/')
  return { data: data as Task, error: null }
}

export async function completeTask(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  await supabase.from('activity_log').insert({
    user_id: user.id, entity_type: 'task', entity_id: id,
    action: 'completed', actor: 'user',
  })

  revalidatePath('/tasks')
  revalidatePath('/')
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/tasks')
}

export async function getTasks(filters: {
  status?: Task['status'] | Task['status'][]
  projectId?: string
  dueBefore?: string
  dueAfter?: string
  limit?: number
} = {}): Promise<Task[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('tasks')
    .select('*, project:projects(id,title,color,icon)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .is('parent_task_id', null) // top-level only

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    query = query.in('status', statuses)
  }
  if (filters.projectId)  query = query.eq('project_id', filters.projectId)
  if (filters.dueBefore)  query = query.lte('due_date', filters.dueBefore)
  if (filters.dueAfter)   query = query.gte('due_date', filters.dueAfter)

  query = query.order('priority', { ascending: true })
              .order('due_date',  { ascending: true, nullsFirst: false })
              .limit(filters.limit ?? 200)

  const { data, error } = await query
  if (error) { console.error('[tasks:get]', error); return [] }
  return (data ?? []) as Task[]
}

export async function getTodayTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  return getTasks({
    status: ['active', 'in_progress', 'blocked'],
    dueBefore: today,
  })
}
