// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'someday'
export type TaskStatus = 'inbox' | 'active' | 'in_progress' | 'blocked' | 'done' | 'archived'
export type IdeaStatus = 'raw' | 'refined' | 'validated' | 'shelved' | 'building' | 'shipped'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type InboxStatus = 'unprocessed' | 'processing' | 'processed' | 'dismissed'
export type MeetingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled'

export interface AIMetadata {
  processed_at?: string
  model_used?: string
  category?: 'task' | 'idea' | 'meeting' | 'note' | 'reminder' | 'document'
  urgency?: Priority
  project_hint?: string
  project_id?: string
  deadline?: string
  entities?: {
    people: string[]
    companies: string[]
    amounts: string[]
    dates: string[]
    locations?: string[]
    urls?: string[]
  }
  action_items?: string[]
  confidence?: number
  summary?: string
  reasoning?: string
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  preferences: Record<string, unknown>
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export interface InboxItem {
  id: string
  user_id: string
  raw_content: string
  source: 'manual' | 'voice' | 'email' | 'api'
  status: InboxStatus
  processed_at: string | null
  promoted_to: string | null
  promoted_id: string | null
  ai_metadata: AIMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  parent_task_id: string | null
  title: string
  notes: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  due_time: string | null
  is_hard_deadline: boolean
  recurrence_rule: string | null
  recurrence_next: string | null
  completed_at: string | null
  context_tags: string[]
  ai_metadata: AIMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  project?: Pick<Project, 'id' | 'title' | 'color' | 'icon'>
  subtasks?: Task[]
}

export interface Project {
  id: string
  user_id: string
  title: string
  description: string | null
  status: ProjectStatus
  color: string | null
  icon: string | null
  priority: Priority
  due_date: string | null
  ai_metadata: AIMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Computed
  task_count?: number
  active_task_count?: number
}

export interface Idea {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  idea_type: 'app' | 'feature' | 'business' | 'process' | 'creative' | 'research' | 'general'
  status: IdeaStatus
  potential: 'high' | 'medium' | 'low' | null
  tags: string[]
  ai_metadata: AIMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Meeting {
  id: string
  user_id: string
  project_id: string | null
  title: string
  meeting_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  attendees: string[]
  raw_notes: string | null
  summary: string | null
  decisions: string[]
  open_questions: string[]
  status: MeetingStatus
  ai_metadata: AIMetadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EntityLink {
  id: string
  user_id: string
  source_type: string
  source_id: string
  target_type: string
  target_id: string
  relationship: string
  created_by: 'user' | 'ai'
  strength: number
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string
  notes?: string
  status?: TaskStatus
  priority?: Priority
  project_id?: string
  parent_task_id?: string
  due_date?: string
  due_time?: string
  is_hard_deadline?: boolean
  recurrence_rule?: string
  context_tags?: string[]
}

export interface CreateIdeaInput {
  title: string
  description?: string
  idea_type?: Idea['idea_type']
  tags?: string[]
  project_id?: string
}

export interface CreateMeetingInput {
  title: string
  meeting_date?: string
  start_time?: string
  end_time?: string
  attendees?: string[]
  project_id?: string
  location?: string
}

export interface CreateProjectInput {
  title: string
  description?: string
  color?: string
  icon?: string
  priority?: Priority
  due_date?: string
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export interface CategorizationResult {
  category: 'task' | 'idea' | 'meeting' | 'note' | 'reminder'
  urgency: Priority
  title: string
  project_hint: string | null
  project_id: string | null
  deadline: string | null
  entities: {
    people: string[]
    companies: string[]
    amounts: string[]
    dates: string[]
  }
  action_items: string[]
  confidence: number
  summary: string
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface SurfaceItem {
  id: string
  type: SurfaceType
  title: string
  description: string
  entity_type?: string
  entity_id?: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  action?: { label: string; href: string }
  created_at: string
}

export type SurfaceType =
  | 'overdue_task'
  | 'stale_idea'
  | 'upcoming_deadline'
  | 'unprocessed_inbox'
  | 'meeting_no_followup'
  | 'project_stalled'
  | 'decision_pending'
  | 'related_context'

export interface DailyDigest {
  surface_items: SurfaceItem[]
  overdue_count: number
  today_tasks: Task[]
  today_meetings: Meeting[]
  upcoming_48h: Task[]
  inbox_unprocessed: number
  generated_at: string
}
