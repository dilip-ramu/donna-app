import type { CouncilMember, MemberId } from '@/types/council/member'

// ── Existing core members ──────────────────────────────────────────────────────

const DONNA: CouncilMember = {
  id: 'donna',
  name: 'Donna',
  role: 'Chief of Staff',
  accentColor: '#7C3AED',
  accentBg: '#F5F3FF',
  accentBgDark: '#1C1030',
  initial: 'D',
  avatarPath: '/Donna.png',
  profileDoc: null,   // personality is hardcoded; no .docx profile
  participationThreshold: 0,
  alwaysParticipates: true,
  responseOrder: 99,
  domainKeywords: [],
}

const PROFESSOR: CouncilMember = {
  id: 'professor',
  name: 'Professor',
  role: 'Planning Intelligence',
  accentColor: '#1D4ED8',
  accentBg: '#EFF6FF',
  accentBgDark: '#0F1E3D',
  initial: 'P',
  avatarPath: '/professor.jpg',
  profileDoc: 'professor',
  participationThreshold: 0.35,
  alwaysParticipates: false,
  responseOrder: 1,
  domainKeywords: [
    'plan', 'plans', 'planning', 'roadmap', 'strategy', 'strategic',
    'phase', 'milestone', 'timeline', 'sequence', 'rollout', 'launch',
    'implement', 'contingency', 'dependency', 'risk', 'architecture',
    'prioritize', 'priority', 'schedule', 'execution', 'deliver',
    'steps', 'next steps', 'approach', 'framework', 'workflow',
    'stage', 'feasibility', 'mvp', 'sprint', 'iteration',
    'objective', 'goal', 'breakdown', 'structure',
  ],
}

const AEGA: CouncilMember = {
  id: 'aega',
  name: 'Aega',
  role: 'Finance Intelligence',
  accentColor: '#059669',
  accentBg: '#ECFDF5',
  accentBgDark: '#022C22',
  initial: 'A',
  avatarPath: '/Aega.png',
  profileDoc: null,   // personality hardcoded; no .docx profile
  participationThreshold: 0.2,
  alwaysParticipates: false,
  responseOrder: 2,
  domainKeywords: [
    'expense', 'expenses', 'spent', 'spend', 'invoice', 'payment',
    'balance', 'recoverable', 'supplier', 'cash', 'cashflow',
    'money', 'budget', 'financial', 'finance', 'receipt', 'transaction',
    'owe', 'paid', 'charge', 'cost', 'revenue', 'income', 'profit',
    '₹', '$', '€', '£', 'inex', 'aega', 'vaultr',
    'accounts', 'outstanding', 'salary', 'tax', 'net worth',
    'assets', 'liabilities', 'savings', 'investment', 'loan', 'debt', 'credit',
  ],
}

// ── New council members ────────────────────────────────────────────────────────

const CORLEONE: CouncilMember = {
  id: 'corleone',
  name: 'Michael Corleone',
  role: 'The Don',
  accentColor: '#8B1A1A',
  accentBg: '#FFF5F5',
  accentBgDark: '#2D0A0A',
  initial: 'MC',
  avatarPath: '/Michael-Corleone.png',
  profileDoc: 'michael corleone',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 3,
  domainKeywords: [],
}

const ABAGNALE: CouncilMember = {
  id: 'abagnale',
  name: 'Frank Abagnale',
  role: 'Con Artist & Hustler',
  accentColor: '#1565C0',
  accentBg: '#E3F2FD',
  accentBgDark: '#0A1929',
  initial: 'FA',
  avatarPath: '/Abagnale.jpg',
  profileDoc: 'frank william abagnale jr',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 4,
  domainKeywords: [],
}

const SPECTER: CouncilMember = {
  id: 'specter',
  name: 'Harvey Specter',
  role: 'Closer',
  accentColor: '#92400E',
  accentBg: '#FFFBEB',
  accentBgDark: '#2D1A0A',
  initial: 'HS',
  avatarPath: '/Harvey.jpg',
  profileDoc: 'harvey specter',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 5,
  domainKeywords: [],
}

const PAULSEN: CouncilMember = {
  id: 'paulsen',
  name: 'Donna Paulsen',
  role: 'COO',
  accentColor: '#9D174D',
  accentBg: '#FDF2F8',
  accentBgDark: '#2D0A1E',
  initial: 'DP',
  avatarPath: '/DonnaPaulsen.png',
  profileDoc: 'donna paulsen',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 6,
  domainKeywords: [],
}

const SHERLOCK: CouncilMember = {
  id: 'sherlock',
  name: 'Sherlock Holmes',
  role: 'Detective',
  accentColor: '#374151',
  accentBg: '#F9FAFB',
  accentBgDark: '#111827',
  initial: 'SH',
  avatarPath: '/sherlock-holmes.png',
  profileDoc: 'sherlock holmes',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 7,
  domainKeywords: [],
}

const REDDINGTON: CouncilMember = {
  id: 'reddington',
  name: 'Raymond Reddington',
  role: 'Fixer',
  accentColor: '#6D1A36',
  accentBg: '#FFF0F5',
  accentBgDark: '#2D0A16',
  initial: 'RR',
  avatarPath: '/Raymond.avif',
  profileDoc: 'raymond reddington',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 8,
  domainKeywords: [],
}

const ROCK: CouncilMember = {
  id: 'rock',
  name: 'The Rock',
  role: 'Execution',
  accentColor: '#B45309',
  accentBg: '#FFFBEB',
  accentBgDark: '#2D1B00',
  initial: 'DR',
  avatarPath: '/the-rock.jpeg',
  profileDoc: 'the rock',
  participationThreshold: 1,
  alwaysParticipates: false,
  responseOrder: 9,
  domainKeywords: [],
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const MEMBERS: Record<MemberId, CouncilMember> = {
  donna:      DONNA,
  professor:  PROFESSOR,
  aega:       AEGA,
  corleone:   CORLEONE,
  abagnale:   ABAGNALE,
  specter:    SPECTER,
  paulsen:    PAULSEN,
  sherlock:   SHERLOCK,
  reddington: REDDINGTON,
  rock:       ROCK,
}

// Ordered for iteration (specialists first by responseOrder, Donna last)
export const MEMBER_LIST: CouncilMember[] = [
  PROFESSOR, AEGA, CORLEONE, ABAGNALE, SPECTER,
  PAULSEN, SHERLOCK, REDDINGTON, ROCK, DONNA,
]

export function getMember(id: MemberId): CouncilMember {
  return MEMBERS[id]
}

export function getAllMembers(): CouncilMember[] {
  return MEMBER_LIST
}
