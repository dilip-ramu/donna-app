import type { MemberId } from './member'

// ── Council Message ────────────────────────────────────────────────────────────

export interface CouncilMessage {
  id: string
  role: 'user' | 'council'
  memberId?: MemberId           // which member spoke (undefined for user messages)
  content: string
  timestamp: number
  isStreaming?: boolean         // true while streaming in progress
}

// Compact format sent to /api/council
export interface ApiCouncilMessage {
  role: 'user' | 'assistant'
  content: string               // assistant messages are prefixed "[MemberName]: ..."
}
