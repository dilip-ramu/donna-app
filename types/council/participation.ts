import type { MemberId } from './member'

// ── Participation Engine Types ─────────────────────────────────────────────────

export interface ParticipationScore {
  memberId: MemberId
  confidence: number            // 0–1
  reasons: string[]
  shouldParticipate: boolean
}

export interface RoutingDecision {
  participants: MemberId[]      // ordered: specialists first, Donna last
  scores: ParticipationScore[]
  isDonnaAlone: boolean         // true = general query, Donna only
}
