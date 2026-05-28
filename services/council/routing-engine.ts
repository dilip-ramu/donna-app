import type { MemberId } from '@/types/council/member'
import type { ParticipationScore, RoutingDecision } from '@/types/council/participation'
import { MEMBER_LIST } from './member-registry'

// ── Keyword Scorer ────────────────────────────────────────────────────────────

function scoreAgainstKeywords(message: string, keywords: string[]): number {
  const lower = message.toLowerCase()
  let score = 0
  let matches = 0

  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      // Multi-word phrases are stronger signals
      const wordCount = keyword.trim().split(/\s+/).length
      const weight = wordCount > 1 ? 0.25 : 0.12
      score += weight
      matches++
    }
  }

  if (matches === 0) return 0

  // Diminishing returns — first few matches matter most
  const normalized = score * (1 / (1 + matches * 0.08))
  return Math.min(1.0, normalized)
}

// ── Context Boosts ────────────────────────────────────────────────────────────
// Additional signals that boost participation confidence

function contextBoosts(message: string, memberId: MemberId): number {
  const lower = message.toLowerCase()
  let boost = 0

  if (memberId === 'professor') {
    // Question structure signals planning intent
    if (/how should i|how do i|what.*best way|where.*start|what.*first/i.test(lower)) boost += 0.15
    if (/next.*month|next.*quarter|over.*year|6 month|12 month/i.test(lower)) boost += 0.15
    if (/\bphase\s*\d|\bstep\s*\d|\bstage\s*\d/i.test(lower)) boost += 0.2
  }

  if (memberId === 'aega') {
    // Currency amounts are strong signals
    if (/[₹$€£]\s*[\d,]+|[\d,]+\s*[₹$€£]/i.test(lower)) boost += 0.3
    if (/\d+.*rupee|rupee.*\d/i.test(lower)) boost += 0.2
    if (/\bowed?\b.*\d|\d.*\bowed?\b/i.test(lower)) boost += 0.15
    // "how much" questions about money/finances are clearly Aega territory
    if (/how much (money|do i have|have i|did i spend|have i spent|is left|do i owe)/i.test(lower)) boost += 0.35
    if (/what('s| is) my (net worth|balance|total|budget|spend|spending)/i.test(lower)) boost += 0.35
    if (/how (much|are|is).*(money|cash|spend|spent|paid|balance|account)/i.test(lower)) boost += 0.25
    if (/am i (over|under|on) budget|can i afford/i.test(lower)) boost += 0.3
  }

  return Math.min(0.4, boost)
}

// ── Name detection ────────────────────────────────────────────────────────────
// Only fires when the user is DIRECTLY addressing a member, not just mentioning them.
// "Aega, what's my balance?" → yes. "Aega is useless" → no.

const MEMBER_NAME_PATTERNS: Record<string, RegExp> = {
  professor: /^(hey\s+)?(professor|prof)[,!?\s]|@professor|ask (the\s+)?professor/i,
  aega:      /^(hey\s+)?aega[,!?\s]|@aega|ask aega/i,
}

// ── Router ────────────────────────────────────────────────────────────────────

export function routeMessage(userMessage: string): RoutingDecision {
  const scores: ParticipationScore[] = []

  for (const member of MEMBER_LIST) {
    if (member.alwaysParticipates) {
      scores.push({
        memberId: member.id,
        confidence: 1.0,
        reasons: ['always participates'],
        shouldParticipate: true,
      })
      continue
    }

    // Direct name address → always include
    const namePattern = MEMBER_NAME_PATTERNS[member.id]
    if (namePattern && namePattern.test(userMessage)) {
      scores.push({
        memberId: member.id,
        confidence: 1.0,
        reasons: ['directly addressed by name'],
        shouldParticipate: true,
      })
      continue
    }

    const baseScore = scoreAgainstKeywords(userMessage, member.domainKeywords)
    const boost    = contextBoosts(userMessage, member.id)
    const confidence = Math.min(1.0, baseScore + boost)
    const shouldParticipate = confidence >= member.participationThreshold

    scores.push({
      memberId: member.id,
      confidence,
      reasons: shouldParticipate
        ? [`domain match ${(confidence * 100).toFixed(0)}%`]
        : [`below threshold (${(confidence * 100).toFixed(0)}% < ${(member.participationThreshold * 100).toFixed(0)}%)`],
      shouldParticipate,
    })
  }

  // Build participant list: specialists ordered by responseOrder, Donna always last
  const specialistParticipants = scores
    .filter(s => s.shouldParticipate && s.memberId !== 'donna')
    .map(s => {
      const member = MEMBER_LIST.find(m => m.id === s.memberId)!
      return { memberId: s.memberId as MemberId, order: member.responseOrder }
    })
    .sort((a, b) => a.order - b.order)
    .map(s => s.memberId)

  const isDonnaAlone = specialistParticipants.length === 0

  const participants: MemberId[] = isDonnaAlone
    ? ['donna']
    : [...specialistParticipants, 'donna']

  return { participants, scores, isDonnaAlone }
}
