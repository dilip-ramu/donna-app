// ── Council Member Types ──────────────────────────────────────────────────────
// Extensible registry for all council personalities.
// Adding a new member = add to MemberId union + member-registry.ts only.

export type MemberId = 'donna' | 'professor' | 'aega'

export interface CouncilMember {
  id: MemberId
  name: string
  role: string                  // Short descriptor shown in UI
  accentColor: string           // Primary brand color (hex)
  accentBg: string              // Tinted background for message bubbles
  accentBgDark: string          // Dark mode bg
  initial: string               // Avatar letter
  participationThreshold: number // 0–1 minimum confidence to participate
  alwaysParticipates: boolean   // true = Donna; overrides threshold
  domainKeywords: string[]      // Heuristic domain signals
  responseOrder: number         // Lower = responds first (specialists before Donna)
}
