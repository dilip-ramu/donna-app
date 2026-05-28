import type { MemberId } from '@/types/council/member'
import type { ParticipationScore, RoutingDecision } from '@/types/council/participation'

// ── Direct address patterns ───────────────────────────────────────────────────
// Fires ONLY when the user explicitly addresses a member.
// "Professor, plan this" → yes. "The professor would say..." → no.

const ADDRESS: Record<string, RegExp> = {
  professor: /^(hey\s+)?(professor|prof)[,!?\s\-]/i,
  aega:      /^(hey\s+)?aega[,!?\s\-]/i,
}

// ── Router ────────────────────────────────────────────────────────────────────
// Default: Donna alone.
// If the user directly addresses a specialist, that specialist responds too.
// Donna still always goes last — she has the final word.

export function routeMessage(userMessage: string): RoutingDecision {
  const scores: ParticipationScore[] = []
  const addressed: MemberId[] = []

  for (const [id, pattern] of Object.entries(ADDRESS)) {
    if (pattern.test(userMessage)) {
      addressed.push(id as MemberId)
    }
  }

  const isDonnaAlone = addressed.length === 0

  // Build scores for type compatibility
  const allMembers: MemberId[] = ['professor', 'aega', 'donna']
  for (const id of allMembers) {
    if (id === 'donna') {
      scores.push({ memberId: 'donna', confidence: 1.0, reasons: ['always responds'], shouldParticipate: true })
    } else {
      const participates = addressed.includes(id as MemberId)
      scores.push({
        memberId:          id as MemberId,
        confidence:        participates ? 1.0 : 0,
        reasons:           participates ? ['directly addressed'] : ['not addressed'],
        shouldParticipate: participates,
      })
    }
  }

  const participants: MemberId[] = isDonnaAlone
    ? ['donna']
    : [...addressed, 'donna']

  return { participants, scores, isDonnaAlone }
}
