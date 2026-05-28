import type { MemberId } from './member'

// ── SSE Stream Event Types ─────────────────────────────────────────────────────

export type StreamPhase = 'member_start' | 'text' | 'member_end' | 'done' | 'error'

export interface StreamEvent {
  phase: StreamPhase
  memberId?: MemberId
  text?: string
  message?: string              // used with 'error' phase
}

// ── Request / Response ─────────────────────────────────────────────────────────

export interface CouncilRequest {
  messages: import('./message').ApiCouncilMessage[]
  userId: string
}
