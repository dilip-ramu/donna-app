import { getTasks } from '@/lib/actions/tasks'
import TasksClient from '@/components/tasks/TasksClient'

export const metadata = { title: 'Tasks' }

export default async function TasksPage() {
  const tasks = await getTasks({ status: ['inbox', 'active', 'in_progress', 'blocked'] })
  return <TasksClient initialTasks={tasks} />
}
