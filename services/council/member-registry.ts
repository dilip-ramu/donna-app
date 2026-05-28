import type { CouncilMember, MemberId } from '@/types/council/member'

// ── Member Definitions ────────────────────────────────────────────────────────
// To add a new council member:
//   1. Add id to MemberId in types/council/member.ts
//   2. Define member here
//   3. Add to MEMBERS record + MEMBER_LIST array
//   4. Add system prompt in system-prompts.ts

const DONNA: CouncilMember = {
  id: 'donna',
  name: 'Donna',
  role: 'Chief of Staff',
  accentColor: '#7C3AED',
  accentBg: '#F5F3FF',
  accentBgDark: '#1C1030',
  initial: 'D',
  avatarPath: '/Donna.png',
  participationThreshold: 0,
  alwaysParticipates: true,
  responseOrder: 99,            // Always last — synthesizes
  domainKeywords: [],           // Donna has no domain filter; she always participates
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
  participationThreshold: 0.35,
  alwaysParticipates: false,
  responseOrder: 1,
  domainKeywords: [
    'plan', 'plans', 'planning', 'planned',
    'roadmap', 'strategy', 'strategic',
    'phase', 'phased', 'phases',
    'milestone', 'milestones',
    'timeline', 'sequence', 'sequencing',
    'rollout', 'launch', 'launching',
    'implement', 'implementation',
    'contingency', 'contingencies',
    'dependency', 'dependencies',
    'risk', 'risks',
    'architecture', 'architect',
    'prioritize', 'priority', 'priorities',
    'quarter', 'month', 'months', 'week', 'weeks',
    'schedule', 'scheduling',
    'execution', 'execute',
    'deliver', 'delivery',
    'steps', 'next steps',
    'approach', 'framework',
    'workflow', 'workplan',
    'stage', 'stages',
    'how should i build', 'how do i build',
    'how should i launch', 'how should i roll',
    'what should i do first', 'where do i start',
    'build over', 'over the next',
    'structure', 'organize',
    'breakdown', 'break down',
    'feasibility', 'viable', 'mvp',
    'sprint', 'iteration', 'iterate',
    'objective', 'objectives', 'goal', 'goals',
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
  participationThreshold: 0.2,
  alwaysParticipates: false,
  responseOrder: 2,
  domainKeywords: [
    'expense', 'expenses', 'spent', 'spend',
    'invoice', 'invoices',
    'payment', 'payments', 'pay',
    'balance', 'balances',
    'recoverable', 'recoverables', 'recover',
    'supplier', 'suppliers', 'vendor', 'vendors',
    'cash', 'cashflow', 'cash flow',
    'money', 'budget', 'budgets',
    'financial', 'finance', 'finances',
    'log expense', 'record expense',
    'receipt', 'receipts',
    'transaction', 'transactions',
    'owe', 'owes', 'owed',
    'paid', 'unpaid', 'pending payment',
    'charge', 'charged',
    'cost', 'costs',
    'revenue', 'income', 'profit',
    '₹', '$', '€', '£',
    'inex', 'aega', 'vaultr',
    'accounts', 'account',
    'outstanding', 'due',
    'salary', 'payroll',
    'tax', 'gst', 'vat',
    'net worth', 'networth', 'wealth',
    'assets', 'liabilities',
    'savings', 'investment', 'investments',
    'portfolio', 'returns',
    'loan', 'loans', 'debt', 'debts',
    'credit', 'debit',
    'afford', 'afford to',
    'how much do i have', 'how much have i spent',
    'how much is', 'how much are',
  ],
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const MEMBERS: Record<MemberId, CouncilMember> = {
  donna: DONNA,
  professor: PROFESSOR,
  aega: AEGA,
}

// Ordered for iteration (specialists first, Donna last)
export const MEMBER_LIST: CouncilMember[] = [PROFESSOR, AEGA, DONNA]

export function getMember(id: MemberId): CouncilMember {
  return MEMBERS[id]
}

export function getAllMembers(): CouncilMember[] {
  return MEMBER_LIST
}
