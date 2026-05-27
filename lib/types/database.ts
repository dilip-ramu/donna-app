export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          timezone: string
          preferences: Json
          onboarded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string
          preferences?: Json
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      inbox_items: {
        Row: {
          id: string
          user_id: string
          raw_content: string
          source: string
          status: string
          processed_at: string | null
          promoted_to: string | null
          promoted_id: string | null
          ai_metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          raw_content: string
          source?: string
          status?: string
          processed_at?: string | null
          promoted_to?: string | null
          promoted_id?: string | null
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['inbox_items']['Insert']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          parent_task_id: string | null
          title: string
          notes: string | null
          status: string
          priority: string
          due_date: string | null
          due_time: string | null
          is_hard_deadline: boolean
          recurrence_rule: string | null
          recurrence_next: string | null
          completed_at: string | null
          context_tags: string[]
          ai_metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          parent_task_id?: string | null
          title: string
          notes?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          due_time?: string | null
          is_hard_deadline?: boolean
          recurrence_rule?: string | null
          recurrence_next?: string | null
          completed_at?: string | null
          context_tags?: string[]
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: string
          color: string | null
          icon: string | null
          priority: string
          due_date: string | null
          ai_metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: string
          color?: string | null
          icon?: string | null
          priority?: string
          due_date?: string | null
          ai_metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: []
      }
      ideas: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          title: string
          description: string | null
          idea_type: string
          status: string
          potential: string | null
          tags: string[]
          ai_metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          title: string
          description?: string | null
          idea_type?: string
          status?: string
          potential?: string | null
          tags?: string[]
          ai_metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['ideas']['Insert']>
        Relationships: []
      }
      meetings: {
        Row: {
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
          status: string
          ai_metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          title: string
          meeting_date?: string | null
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          attendees?: string[]
          raw_notes?: string | null
          summary?: string | null
          decisions?: string[]
          open_questions?: string[]
          status?: string
          ai_metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
        Relationships: []
      }
      entity_links: {
        Row: {
          id: string
          user_id: string
          source_type: string
          source_id: string
          target_type: string
          target_id: string
          relationship: string
          created_by: string
          strength: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_type: string
          source_id: string
          target_type: string
          target_id: string
          relationship: string
          created_by?: string
          strength?: number
          metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['entity_links']['Insert']>
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: string
          entity_id: string
          action: string
          actor?: string
          metadata?: Json
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
