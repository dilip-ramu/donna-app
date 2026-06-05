import type { MemberId } from '@/types/council/member'
import type { ParticipationScore, RoutingDecision } from '@/types/council/participation'

// ── Direct address patterns ───────────────────────────────────────────────────
// Fires ONLY when the user explicitly addresses a member by name.
// The character class [,!?\s\-] catches: "Harvey," / "Harvey!" / "Harvey-" / "Harvey "

const ADDRESS: Record<string, RegExp> = {
  professor:  /^(hey\s+)?(professor|prof)[,!?\s\-]/i,
  aega:       /^(hey\s+)?aega[,!?\s\-]/i,
  corleone:   /^(hey\s+)?(michael\s+corleone|corleone|michael)[,!?\s\-]/i,
  abagnale:   /^(hey\s+)?(frank(\s+(william\s+)?abagnale(\s+jr)?)?|abagnale)[,!?\s\-]/i,
  specter:    /^(hey\s+)?(harvey(\s+specter)?|specter)[,!?\s\-]/i,
  paulsen:    /^(hey\s+)?(donna\s+paulsen|paulsen)[,!?\s\-]/i,  // NOT just "Donna" — that's the AI chief
  sherlock:   /^(hey\s+)?(sherlock(\s+holmes)?|holmes)[,!?\s\-]/i,
  reddington: /^(hey\s+)?(raymond(\s+reddington)?|reddington|red)[,!?\s\-]/i,
  rock:       /^(hey\s+)?(the\s+rock|rock|dwayne)[,!?\s\-]/i,
}

// ── Router ────────────────────────────────────────────────────────────────────
// Default: Donna alone.
// If the user directly addresses a specialist, that specialist + Donna respond.
// Donna still always goes last.

export function routeMessage(userMessage: string): RoutingDecision {
  const scores: ParticipationScore[] = []
  const addressed: MemberId[] = []

  for (const [id, pattern] of Object.entries(ADDRESS)) {
    if (pattern.test(userMessage)) {
      addressed.push(id as MemberId)
    }
  }

  const isDonnaAlone = addressed.length === 0

  const allMembers: MemberId[] = [
    'professor', 'aega', 'corleone', 'abagnale', 'specter',
    'paulsen', 'sherlock', 'reddington', 'rock', 'donna',
  ]

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
