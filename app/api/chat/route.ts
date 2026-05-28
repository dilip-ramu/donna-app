import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[chat] ANTHROPIC_API_KEY is not set — AI responses will fail')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'missing',
})

export const runtime = 'nodejs'
export const maxDuration = 30

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function getUserContext(userId: string): Promise<string> {
  try {
    const supabase = createServiceClient()

    // Fetch today's tasks
    const today = new Date().toISOString().split('T')[0]
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, priority, status, due_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'done')
      .order('priority', { ascending: true })
      .limit(20)

    // Fetch recent inbox items
    const { data: inbox } = await supabase
      .from('inbox_items')
      .select('raw_content, ai_metadata, created_at')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch active projects
    const { data: projects } = await supabase
      .from('projects')
      .select('title, status, description')
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .limit(10)

    // Fetch memory notes (tagged [memory] in inbox)
    const { data: memoryRaw } = await supabase
      .from('inbox_items')
      .select('raw_content, created_at')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .ilike('raw_content', '[memory]%')
      .order('created_at', { ascending: false })
      .limit(8)

    let context = `Today's date: ${today}\n\n`

    if (tasks && tasks.length > 0) {
      context += `## Active Tasks (${tasks.length})\n`
      tasks.forEach((t: { title: string; priority: string; due_date?: string | null }) => {
        const due = t.due_date ? ` (due: ${t.due_date})` : ''
        context += `- [${t.priority}] ${t.title}${due}\n`
      })
      context += '\n'
    }

    if (inbox && inbox.length > 0) {
      context += `## Inbox (${inbox.length} unprocessed)\n`
      inbox.slice(0, 5).forEach((i: { raw_content: string }) => {
        if (!i.raw_content.startsWith('[memory]')) {
          context += `- ${i.raw_content}\n`
        }
      })
      context += '\n'
    }

    if (memoryRaw && memoryRaw.length > 0) {
      context += `## Memory Notes\n`
      memoryRaw.forEach((i: { raw_content: string }) => {
        context += `- ${i.raw_content.replace(/^\[memory\]\s*/i, '')}\n`
      })
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
    return `Today's date: ${new Date().toISOString().split('T')[0]}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json() as {
      messages: ChatMessage[]
      userId: string
    }

    if (!messages || !userId) {
      return new Response('Missing messages or userId', { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '⚠️ ANTHROPIC_API_KEY is not set in your Vercel environment variables. Add it at vercel.com → your project → Settings → Environment Variables, then redeploy.' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    }

    const userContext = await getUserContext(userId)

    const systemPrompt = `You are Donna — a sharp, warm personal AI chief of staff built for one person. Your job is to help them stay clear-headed, focused, and on top of everything that matters.

Personality:
- Direct and efficient, never cold or robotic
- Warm but not sycophantic — skip filler phrases like "Great question!"
- You notice what matters and surface it proactively
- Short, crisp answers unless the user is clearly asking for depth
- Markdown only when it genuinely helps readability (avoid gratuitous bullets)
- First-person conversational tone, like a trusted colleague

What you can do:
- Give a smart summary of tasks, inbox, and projects
- Help the user prioritise, plan their day, and think through decisions
- Answer questions about their workload, upcoming commitments, and backlog
- Think through problems, draft things, brainstorm ideas
- For logging expenses or querying finances → remind them to switch to Finance mode

Rules:
- Be specific: use real task/project names from context when you refer to them
- If you don't have enough information, say so concisely and suggest where to look
- Never invent tasks or projects that aren't in the context
- Keep responses conversational unless a structured list genuinely helps

Current snapshot of the user's world:
${userContext}`

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const data = JSON.stringify({ text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          const data = JSON.stringify({ text: `\n\n[Error: ${errMsg}]` })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return new Response('Internal server error', { status: 500 })
  }
}
