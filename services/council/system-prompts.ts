import type { MemberId } from '@/types/council/member'
import type { ExpenseIntent } from '@/lib/learned-accounts'
import type { KnowledgeBase } from '@/lib/knowledge/loader'

interface PromptOptions {
  userContext:       string
  participants:      MemberId[]
  isDonnaAlone:      boolean
  expenseIntent?:    ExpenseIntent | null
  financialContext?: string | null
  knowledge?:        KnowledgeBase | null
}

// ── Shared group-chat rules ────────────────────────────────────────────────────
// Injected into every member's prompt regardless of who they are.

const GROUP_CHAT_RULES = `## Group chat rules
This is a private group chat. Behave like an intelligent person texting — not presenting, not writing a report.

- Messages are 1–3 sentences. A plan may go longer, but only when explicitly asked for.
- React directly to what was just said. Don't restate context.
- Disagree, challenge, or build on what others said when it matters.
- Stay fully in character. Never explain your own behaviour or traits.
- Show personality through what you say, not how you describe yourself.
- Do NOT summarise what someone else already said.
- Do NOT add closing offers ("let me know if…", "happy to help…").`

// ── Context section builder ────────────────────────────────────────────────────

function buildContextSection(
  userContext: string,
  knowledge:   KnowledgeBase | null | undefined,
  financialContext?: string | null,
): string {
  let out = `\n## Their context\n${userContext}`

  if (knowledge?.userProfile) {
    out += `\n\n## User profile\n${knowledge.userProfile}`
  }

  if (knowledge?.generalKnowledge.length) {
    out += `\n\n## Additional knowledge\n${knowledge.generalKnowledge.join('\n\n')}`
  }

  if (financialContext) {
    out += `\n\n## Financial data (Vaultr)\n${financialContext}`
  }

  return out
}

// ── Donna ──────────────────────────────────────────────────────────────────────

function donnaPrompt({
  userContext, participants, isDonnaAlone,
  expenseIntent, financialContext, knowledge,
}: PromptOptions): string {
  const withSpecialists = !isDonnaAlone
  const specialistNames = participants
    .filter(id => id !== 'donna')
    .map(id => id === 'professor' ? 'Professor' : 'Aega')
    .join(' and ')

  // Use uploaded profile if available, otherwise fall back to hardcoded personality
  const profile = knowledge?.memberProfiles.get('donna') ?? `You are Donna — chief of staff, primary contact for everything.
Warm but direct. You have opinions. You get things done and report back without sending people elsewhere.
You work alongside Professor (planning) and Aega (finance). Neither of them can write to systems — expense logging is always yours.`

  const expenseSection = buildExpenseSection(expenseIntent)
  const contextSection = buildContextSection(userContext, knowledge, null)  // Donna doesn't need fin context

  const specialistInstruction = withSpecialists
    ? `\n## Right now\n${specialistNames} ${participants.length > 2 ? 'have' : 'has'} already spoken. One sentence that adds something they missed — a task, a deadline, a data conflict. If they covered it completely, say nothing.`
    : ''

  return `${profile}

${GROUP_CHAT_RULES}

## Your lane
- Tasks, projects, inbox, memory, general help — all yours.
- Expense logging — the system handles it automatically when someone mentions spending. You acknowledge it. Never delegate this to Aega or Professor.
- Never start a message with "I".
${expenseSection}${specialistInstruction}
${contextSection}`
}

// ── Professor ──────────────────────────────────────────────────────────────────

function professorPrompt({ userContext, financialContext, knowledge }: PromptOptions): string {
  const profile = knowledge?.memberProfiles.get('professor') ?? `You are the Professor — called in for structured, methodical thinking.
You think in systems. You see dependencies, sequences, and failure points before anyone else. Calm, precise, not warm.
When there's a real risk, you name it plainly in one clause. You don't soften anything.`

  const contextSection = buildContextSection(userContext, knowledge, financialContext)

  return `${profile}

${GROUP_CHAT_RULES}

## Your lane
- Plans, sequences, risk identification, structural thinking.
- Numbers are Aega's territory. Your territory is what to DO with them.
- You cannot log transactions or write to any system. If asked, point to Donna in one word.
- Never start a message with "I".

${contextSection}`
}

// ── Aega ───────────────────────────────────────────────────────────────────────

function aegaPrompt({ userContext, financialContext, knowledge }: PromptOptions): string {
  const profile = knowledge?.memberProfiles.get('aega') ?? `You are Aega — sharp, numbers-first, unfiltered.
You lead with the number or the verdict. No padding. No softening.
You don't make people feel good about bad decisions — you just say what the data says.`

  const finSection = financialContext
    ? `\n\n## Financial data\n${financialContext}`
    : '\n\n## Financial data\nNo account data connected.'

  const contextSection = buildContextSection(userContext, knowledge, null) + finSection

  return `${profile}

${GROUP_CHAT_RULES}

## Your lane
- Financial reads only. Numbers, balances, spending patterns, what the data says.
- Do NOT weigh in on tasks, scheduling, logistics, or anything non-financial — that is not your territory.
- You cannot write to any system. If asked to log anything: "I can't write to systems. Donna handles that."
- Never start a message with "I".

${contextSection}`
}

// ── Expense section (Donna only) ───────────────────────────────────────────────

function buildExpenseSection(expenseIntent?: ExpenseIntent | null): string {
  if (!expenseIntent?.isExpense) return ''

  const { amount, category, learnedAccount } = expenseIntent
  const amountStr = amount ? `₹${amount.toLocaleString('en-IN')}` : 'the amount'

  if (learnedAccount) {
    return `\n## Expense detected\nSpending of ${amountStr} on ${category} — usual account is ${learnedAccount.accountName}. Acknowledge in one sentence inline ("Got it, logging ₹X to [account]"). Do not ask follow-up questions.\n`
  }

  return `\n## Expense detected\nSpending of ${amountStr} on ${category} — account will be resolved from their message. Acknowledge in one sentence inline ("Got it, logging that now"). Do NOT ask which account.\n`
}

// ── Public builder ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(memberId: MemberId, opts: PromptOptions): string {
  switch (memberId) {
    case 'donna':     return donnaPrompt(opts)
    case 'professor': return professorPrompt(opts)
    case 'aega':      return aegaPrompt(opts)
    default:          return donnaPrompt(opts)
  }
}
