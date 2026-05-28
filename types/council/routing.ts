import type { MemberId } from './member'

// ── SSE Stream Event Types ─────────────────────────────────────────────────────

export type StreamPhase = 'member_start' | 'text' | 'member_end' | 'done' | 'error'

export interface StreamEvent {
  phase: StreamPhase
  memberId?: MemberId
  text?: string
  message?: string              // used with 'error' phase
}

// ── Conference Stream Event Types ─────────────────────────────────────────────

export type ConferencePhase =
  | 'round_start'     // new round beginning
  | 'member_start'    // member starting to speak
  | 'text'            // streamed text chunk
  | 'member_end'      // member done speaking
  | 'round_end'       // round complete
  | 'done'
  | 'error'

export interface ConferenceEvent {
  phase: ConferencePhase
  round?: number              // 1 = positions, 2 = discussion, 3 = donna's call
  roundLabel?: string         // "Opening positions" | "The discussion" | "Donna's call"
  memberId?: MemberId
  text?: string
  message?: string
}

// ── Request / Response ─────────────────────────────────────────────────────────

export interface CouncilRequest {
  messages: import('./message').ApiCouncilMessage[]
  userId: string
}
