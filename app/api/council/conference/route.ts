/**
 * POST /api/council/conference
 *
 * Runs a structured conference discussion between council members.
 * Round 1 — Opening positions: Professor + Aega each state their take.
 * Round 2 — The discussion: each responds directly to the other.
 * Round 3 — Donna's call: synthesises and gives one clear recommendation.
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getFinanceSummary, getAccounts } from '@/services/vaultr/finance'
import { resolveVaultrUserId } from '@/services/vaultr/db'
import type { ConferenceEvent } from '@/types/council/routing'
import type { MemberId } from '@/types/council/member'

export const runtime     = 'nodejs'
export const maxDuration = 120   // conferences take longer

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'missing',
})

// ── Context fetchers ───────────────────────────────────────────────────────────

async function getUserContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient()
    const today    = new Date().toISOString().split('T')[0]
    const [{ data: tasks }, { data: projects }, { data: memoryRaw }] = await Promise.all([
      supabase.from('tasks').select('title, priority, due_date').eq('user_id', userId)
        .is('deleted_at', null).neq('status', 'done').order('priority').limit(15),
      supabase.from('projects').select('title, description').eq('user_id', userId)
        .eq('status', 'active').is('deleted_at', null).limit(8),
      supabase.from('inbox_items').select('raw_content').eq('user_id', userId)
        .is('deleted_at', null).ilike('raw_content', '[memory]%').limit(10),
    ])
    let ctx = `Today: ${today}\n\n`
    if (tasks?.length)     { ctx += `## Tasks\n`;    tasks.forEach(t    => { ctx += `- [${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}\n` }); ctx += '\n' }
    if (memoryRaw?.length) { ctx += `## Memory\n`;  memoryRaw.forEach(i => { ctx += `- ${i.raw_content.replace(/^\[memory\]\s*/i, '')}\n` });                    ctx += '\n' }
    if (projects?.length)  { ctx += `## Projects\n`; projects.forEach(p  => { ctx += `- ${p.title}${p.description ? `: ${p.description}` : ''}\n` }) }
    return ctx
  } catch { return `Today: ${new Date().toISOString().split('T')[0]}` }
}

async function getFinancialContext(email: string): Promise<string | null> {
  try {
    const vaultrUserId = await resolveVaultrUserId(email)
    if (!vaultrUserId) return null
    const [summary, accounts] = await Promise.all([
      getFinanceSummary(vaultrUserId).catch(() => null),
      getAccounts(vaultrUserId).catch(() => []),
    ])
    let ctx = ''
    if (accounts.length) {
      ctx += '## Accounts\n'
      accounts.filter(a => a.is_active).forEach(a => {
        ctx += `- ${a.name} (${a.type}): ₹${Number(a.initial_balance ?? 0).toLocaleString('en-IN')}\n`
      })
      ctx += '\n'
    }
    if (summary) {
      ctx += `Net worth: ₹${Number(summary.netWorth).toLocaleString('en-IN')}\n`
      ctx += `Monthly income: ₹${Number(summary.monthlyIncome).toLocaleString('en-IN')}\n`
      ctx += `Monthly expenses: ₹${Number(summary.monthlyExpense).toLocaleString('en-IN')}\n`
      ctx += `Monthly balance: ₹${Number(summary.monthlyBalance).toLocaleString('en-IN')}\n`
    }
    return ctx || null
  } catch { return null }
}

// ── Single LLM call (non-streaming, returns full text) ────────────────────────

async function callMember(system: string, history: Anthropic.MessageParam[], maxTokens = 200): Promise<string> {
  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system,
    messages:   history,
  })
  return response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
}

// ── Conference system prompts ─────────────────────────────────────────────────

function professorConferencePrompt(round: 1 | 2, topic: string, userCtx: string, priorText?: string): string {
  if (round === 1) return `You are the Professor — part of a council advising one person. A conference has been called on: "${topic}".

State your position clearly and concisely. Focus on structure, timing, risks, and sequencing. What's the key thing they need to think about here?

Keep it to 2-3 sentences max. No headers. Talk like a person, not a report. Don't start with "I".

${userCtx}`

  return `You are the Professor. A conference is underway on: "${topic}".

Aega just said: "${priorText}"

Respond directly to what he said. Do you agree? Push back if the numbers don't tell the full story. Add your angle on timing or risk that he hasn't covered. 2-3 sentences. Conversational. Don't start with "I".

${userCtx}`
}

function aegaConferencePrompt(round: 1 | 2, topic: string, userCtx: string, financialCtx: string | null, priorText?: string): string {
  const finSection = financialCtx
    ? `\n## Financial data\n${financialCtx}`
    : '\n## Financial data\nNo account data connected.'

  if (round === 1) return `You are Aega — finance intelligence on a council. A conference has been called on: "${topic}".

Lead with the numbers. What does the financial picture say about this? Use the data you have. Be direct.

2-3 sentences max. No headers. Conversational. Don't start with "I".
${finSection}

${userCtx}`

  return `You are Aega. A conference is underway on: "${topic}".

The Professor just said: "${priorText}"

Respond to his point with the numbers. Does the financial data support or challenge what he said? Concrete, brief. 2-3 sentences. Don't start with "I".
${finSection}

${userCtx}`
}

function donnaClosePrompt(topic: string, userCtx: string, discussion: string): string {
  return `You are Donna. A council conference just concluded on: "${topic}".

Here's what was said:
${discussion}

Give one clear recommendation. What should the person actually DO? Pull from what Professor and Aega said, factor in anything from their tasks or projects that's relevant, and land on a concrete next step.

3 sentences max. Direct. No headers. Don't start with "I". Don't summarise the discussion — just give the call.

${userCtx}`
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function enc(encoder: TextEncoder, event: ConferenceEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { topic, userId } = await req.json() as { topic: string; userId: string }
    if (!topic || !userId) return new Response('Missing topic or userId', { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [userCtx, financialCtx] = await Promise.all([
      getUserContext(userId),
      user?.email ? getFinancialContext(user.email).catch(() => null) : Promise.resolve(null),
    ])

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: ConferenceEvent) => controller.enqueue(enc(encoder, event))

        try {
          // ── Round 1: Opening positions ─────────────────────────────────────
          send({ phase: 'round_start', round: 1, roundLabel: 'Opening positions' })

          // Professor — Round 1
          send({ phase: 'member_start', memberId: 'professor', round: 1 })
          const professorR1 = await callMember(
            professorConferencePrompt(1, topic, userCtx),
            [{ role: 'user', content: topic }],
            180,
          )
          send({ phase: 'text', memberId: 'professor', text: professorR1, round: 1 })
          send({ phase: 'member_end', memberId: 'professor', round: 1 })

          // Aega — Round 1
          send({ phase: 'member_start', memberId: 'aega', round: 1 })
          const aegaR1 = await callMember(
            aegaConferencePrompt(1, topic, userCtx, financialCtx),
            [{ role: 'user', content: topic }],
            180,
          )
          send({ phase: 'text', memberId: 'aega', text: aegaR1, round: 1 })
          send({ phase: 'member_end', memberId: 'aega', round: 1 })
          send({ phase: 'round_end', round: 1 })

          // ── Round 2: The discussion ────────────────────────────────────────
          send({ phase: 'round_start', round: 2, roundLabel: 'The discussion' })

          // Professor responds to Aega's R1
          send({ phase: 'member_start', memberId: 'professor', round: 2 })
          const professorR2 = await callMember(
            professorConferencePrompt(2, topic, userCtx, aegaR1),
            [{ role: 'user', content: topic }, { role: 'assistant', content: aegaR1 }],
            160,
          )
          send({ phase: 'text', memberId: 'professor', text: professorR2, round: 2 })
          send({ phase: 'member_end', memberId: 'professor', round: 2 })

          // Aega responds to Professor's R1
          send({ phase: 'member_start', memberId: 'aega', round: 2 })
          const aegaR2 = await callMember(
            aegaConferencePrompt(2, topic, userCtx, financialCtx, professorR1),
            [{ role: 'user', content: topic }, { role: 'assistant', content: professorR1 }],
            160,
          )
          send({ phase: 'text', memberId: 'aega', text: aegaR2, round: 2 })
          send({ phase: 'member_end', memberId: 'aega', round: 2 })
          send({ phase: 'round_end', round: 2 })

          // ── Round 3: Donna's call ──────────────────────────────────────────
          send({ phase: 'round_start', round: 3, roundLabel: "Donna's call" })
          send({ phase: 'member_start', memberId: 'donna', round: 3 })

          const discussion = [
            `Professor (positions): ${professorR1}`,
            `Aega (positions): ${aegaR1}`,
            `Professor (discussion): ${professorR2}`,
            `Aega (discussion): ${aegaR2}`,
          ].join('\n\n')

          const donnaClose = await callMember(
            donnaClosePrompt(topic, userCtx, discussion),
            [{ role: 'user', content: `Conference topic: ${topic}\n\nDiscussion:\n${discussion}` }],
            200,
          )
          send({ phase: 'text', memberId: 'donna', text: donnaClose, round: 3 })
          send({ phase: 'member_end', memberId: 'donna', round: 3 })
          send({ phase: 'round_end', round: 3 })

          send({ phase: 'done' })
          controller.close()

        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          send({ phase: 'error', message: msg })
          send({ phase: 'done' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  } catch {
    return new Response('Internal server error', { status: 500 })
  }
}
