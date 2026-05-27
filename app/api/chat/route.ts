import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
      context += `## Inbox Items (${inbox.length} unprocessed)\n`
      inbox.slice(0, 5).forEach((i: { raw_content: string; category?: string | null }) => {
        context += `- ${i.raw_content}${i.category ? ` [${i.category}]` : ''}\n`
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

    const userContext = await getUserContext(userId)

    const systemPrompt = `You are Donna — a sharp, warm personal AI chief of staff. You help the user stay on top of their work and life with clarity and calm confidence.

Your personality:
- Direct and efficient, but never cold
- Proactive — you notice patterns and surface what matters
- You remember context within this conversation
- You never pad responses with unnecessary words
- You use markdown sparingly (only when it genuinely helps)
- Short, crisp answers unless depth is needed

Your capabilities:
- Summarizing tasks, inbox, and projects
- Helping prioritize and plan the day
- Capturing ideas and notes (tell the user to use the inbox capture for now)
- Answering questions about their workload
- Thinking through problems together

Current user context:
${userContext}

When referring to tasks or projects, be specific with names. If you don't have information about something, say so briefly and suggest where to find it.`

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
