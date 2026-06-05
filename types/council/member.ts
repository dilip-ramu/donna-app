// ── Council Member Types ──────────────────────────────────────────────────────
// Extensible registry for all council personalities.
// Adding a new member = add to MemberId union + member-registry.ts only.

export type MemberId =
  | 'donna'
  | 'professor'
  | 'aega'
  | 'corleone'
  | 'abagnale'
  | 'specter'
  | 'paulsen'
  | 'sherlock'
  | 'reddington'
  | 'rock'

export interface CouncilMember {
  id: MemberId
  name: string
  role: string                  // Short descriptor shown in UI
  accentColor: string           // Primary brand color (hex)
  accentBg: string              // Tinted background for message bubbles
  accentBgDark: string          // Dark mode bg
  initial: string               // Avatar letter (fallback when no photo)
  avatarPath: string | null     // Static public-folder image path, e.g. '/Donna.png'
  profileDoc: string | null     // Lowercase docx filename (no ext) in /public, e.g. 'harvey specter'
  participationThreshold: number
  alwaysParticipates: boolean   // true = Donna; overrides threshold
  domainKeywords: string[]
  responseOrder: number         // Lower = responds first (specialists before Donna)
}
