import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { routeMessage } from '@/services/council/routing-engine'
import { buildSystemPrompt } from '@/services/council/system-prompts'
import { getMember } from '@/services/council/member-registry'
import type { MemberId } from '@/types/council/member'
import type { ApiCouncilMessage } from '@/types/council/message'
import type { StreamEvent } from '@/types/council/routing'
import type { RoutingDecision } from '@/types/council/participation'

export const runtime    = 'nodejs'
export const maxDuration = 60

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[council] ANTHROPIC_API_KEY not set')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'missing',
})

// ── User Context ───────────────────────────────────────────────────────────────

async function getUserContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient()
    const today    = new Date().toISOString().split('T')[0]

    const [{ data: tasks }, { data: inbox }, { data: projects }, { data: memoryRaw }] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('title, priority, status, due_date')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .neq('status', 'done')
          .order('priority', { ascending: true })
          .limit(20),

        supabase
          .from('inbox_items')
          .select('raw_content')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .not('raw_content', 'ilike', '[memory]%')
          .order('created_at', { ascending: false })
          .limit(8),

        supabase
          .from('projects')
          .select('title, description')
          .eq('user_id', userId)
          .eq('status', 'active')
          .is('deleted_at', null)
          .limit(10),

        supabase
          .from('inbox_items')
          .select('raw_content')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .ilike('raw_content', '[memory]%')
          .order('created_at', { ascending: false })
          .limit(15),
      ])

    let context = `Today: ${today}\n\n`

    if (tasks && tasks.length > 0) {
      context += `## Tasks\n`
      tasks.forEach((t: { title: string; priority: string; due_date?: string | null }) => {
        context += `- [${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}\n`
      })
      context += '\n'
    }

    if (memoryRaw && memoryRaw.length > 0) {
      context += `## Memory (personal facts)\n`
      memoryRaw.forEach((i: { raw_content: string }) => {
        context += `- ${i.raw_content.replace(/^\[memory\]\s*/i, '')}\n`
      })
      context += '\n'
    }

    if (inbox && inbox.length > 0) {
      context += `## Inbox\n`
      inbox.forEach((i: { raw_content: string }) => { context += `- ${i.raw_content}\n` })
      context += '\n'
    }

    if (projects && projects.length > 0) {
      context += `## Active Projects\n`
      projects.forEach((p: { title: string; description?: string | null }) => {
        context += `- ${p.title}${p.description ? `: ${p.description}` : ''}\n`
      })
    }

    return context
  } catch {
    return `Today: ${new Date().toISOString().split('T')[0]}`
  }
}

// ── Conversation History Formatter ────────────────────────────────────────────
// Converts council message history to Anthropic API format.
// Council messages are labeled with member name so Claude maintains context.

function buildApiHistory(messages: ApiCouncilMessage[]): Anthropic.MessageParam[] {
  // Remove the last user message (it's the current one, handled separately)
  const history = messages.slice(0, -1)
  return history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
}

// ── Member Response Generator ──────────────────────────────────────────────────

async function* generateMemberResponse(
  memberId: MemberId,
  messages: ApiCouncilMessage[],
  userContext: string,
  routing: RoutingDecision,
): AsyncGenerator<string> {
  const member    = getMember(memberId)
  const systemPrompt = buildSystemPrompt(memberId, {
    userContext,
    participants: routing.participants,
    isDonnaAlone: routing.isDonnaAlone,
  })

  const history   = buildApiHistory(messages)
  const lastMsg   = messages[messages.length - 1]

  const apiMessages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: lastMsg.content },
  ]

  const stream = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: memberId === 'professor' ? 1024 : 512,
    system:     systemPrompt,
    messages:   apiMessages,
    stream:     true,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

// ── SSE Helpers ────────────────────────────────────────────────────────────────

function encodeEvent(encoder: TextEncoder, event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json() as {
      messages: ApiCouncilMessage[]
      userId: string
    }

    if (!messages?.length || !userId) {
      return new Response('Missing messages or userId', { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return sseError('⚠️ ANTHROPIC_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.')
    }

    // Determine which council members participate
    const lastUserMessage = messages[messages.length - 1]?.content ?? ''
    const routing = routeMessage(lastUserMessage)

    // Fetch user context (shared across all member prompts)
    const userContext = await getUserContext(userId)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) =>
          controller.enqueue(encodeEvent(encoder, event))

        try {
          // Stream each participant in order
          for (const memberId of routing.participants) {
            send({ phase: 'member_start', memberId })

            try {
              for await (const text of generateMemberResponse(memberId, messages, userContext, routing)) {
                send({ phase: 'text', memberId, text })
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unknown error'
              send({ phase: 'text', memberId, text: `[Error: ${msg}]` })
            }

            send({ phase: 'member_end', memberId })
          }

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

function sseError(message: string): Response {
  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      send({ phase: 'member_start', memberId: 'donna' })
      send({ phase: 'text', memberId: 'donna', text: message })
      send({ phase: 'member_end', memberId: 'donna' })
      send({ phase: 'done' })
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
