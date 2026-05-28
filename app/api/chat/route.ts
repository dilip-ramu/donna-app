import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[chat] ANTHROPIC_API_KEY is not set — AI responses will fail')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'missing',
})

export const runtime = 'nodejs'
export const maxDuration = 45   // extra time for tool calls

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get current weather and forecast for any city or location. Use this whenever the user asks about weather, temperature, rain, forecast, or climate in any place.',
    input_schema: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name or location, e.g. "Aarhus", "Mumbai", "New York"',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for current information — news, prices, facts, events, people, companies, sports scores, anything that might have changed recently. Use this when the user asks about something you may not have up-to-date knowledge about.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
]

// ── Tool implementations ───────────────────────────────────────────────────────

async function getWeather(location: string): Promise<string> {
  try {
    // wttr.in — free, no key required, returns structured JSON
    const encoded = encodeURIComponent(location)
    const res = await fetch(`https://wttr.in/${encoded}?format=j1`, {
      headers: { 'User-Agent': 'Donna-AI/1.0' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`wttr.in returned ${res.status}`)
    const data = await res.json() as {
      current_condition: Array<{
        temp_C: string
        temp_F: string
        FeelsLikeC: string
        weatherDesc: Array<{ value: string }>
        humidity: string
        windspeedKmph: string
        observation_time: string
      }>
      nearest_area: Array<{
        areaName: Array<{ value: string }>
        country: Array<{ value: string }>
      }>
      weather: Array<{
        date: string
        maxtempC: string
        mintempC: string
        hourly: Array<{
          weatherDesc: Array<{ value: string }>
          tempC: string
          time: string
        }>
      }>
    }

    const cur    = data.current_condition[0]
    const area   = data.nearest_area[0]
    const place  = `${area.areaName[0].value}, ${area.country[0].value}`
    const desc   = cur.weatherDesc[0].value
    const tempC  = cur.temp_C
    const feelsC = cur.FeelsLikeC
    const humid  = cur.humidity
    const wind   = cur.windspeedKmph

    let result = `**${place}** — ${desc}\n`
    result += `🌡 ${tempC}°C (feels like ${feelsC}°C) · 💧 ${humid}% humidity · 💨 ${wind} km/h\n\n`

    // Next 2 days forecast
    if (data.weather.length > 1) {
      result += '**Forecast:**\n'
      data.weather.slice(0, 3).forEach(day => {
        const dayDesc = day.hourly[4]?.weatherDesc[0].value ?? ''
        result += `- ${day.date}: ${day.mintempC}–${day.maxtempC}°C ${dayDesc}\n`
      })
    }
    return result
  } catch (err) {
    return `Couldn't fetch weather for "${location}". ${err instanceof Error ? err.message : 'Try again.'}`
  }
}

async function searchWeb(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY
  if (!tavilyKey) {
    return `Web search is not configured. Add TAVILY_API_KEY to your Vercel environment variables (free at tavily.com) to enable live search.`
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Tavily returned ${res.status}`)
    const data = await res.json() as {
      answer?: string
      results: Array<{ title: string; content: string; url: string }>
    }

    let result = ''
    if (data.answer) result += `**Summary:** ${data.answer}\n\n`
    if (data.results.length > 0) {
      result += '**Sources:**\n'
      data.results.slice(0, 4).forEach(r => {
        result += `- [${r.title}](${r.url}): ${r.content.slice(0, 200)}…\n`
      })
    }
    return result || 'No results found.'
  } catch (err) {
    return `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

async function executeTool(name: string, input: Record<string, string>): Promise<string> {
  if (name === 'get_weather') return getWeather(input.location)
  if (name === 'search_web')  return searchWeb(input.query)
  return `Unknown tool: ${name}`
}

// ── User context ──────────────────────────────────────────────────────────────

async function getUserContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

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
          .limit(12),
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
      context += `## Memory (personal facts about the user)\n`
      memoryRaw.forEach((i: { raw_content: string }) => {
        context += `- ${i.raw_content.replace(/^\[memory\]\s*/i, '')}\n`
      })
      context += '\n'
    }

    if (inbox && inbox.length > 0) {
      const nonMemory = inbox.filter((i: { raw_content: string }) => !i.raw_content.startsWith('[memory]'))
      if (nonMemory.length > 0) {
        context += `## Inbox\n`
        nonMemory.forEach((i: { raw_content: string }) => { context += `- ${i.raw_content}\n` })
        context += '\n'
      }
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

// ── Route handler ──────────────────────────────────────────────────────────────

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
      return sseError('⚠️ ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.')
    }

    const userContext = await getUserContext(userId)

    const systemPrompt = `You are Donna — a sharp, warm personal AI chief of staff and secretary. You help one person stay clear-headed and on top of everything.

Personality:
- Direct and efficient, never cold
- Warm but not sycophantic — no "Great question!" filler
- Short answers unless depth is clearly needed
- Conversational tone, like a trusted colleague who knows you well

Capabilities:
- Summarise tasks, inbox, projects from the snapshot below
- Help plan the day, prioritise, think through decisions
- Draft emails, messages, documents
- Look up current weather and search the web using your tools — use them freely
- Remember personal facts the user shares (birthday, family, preferences etc.)
- For logging expenses → remind to use Finance mode

Rules:
- Use real names from context, never invent tasks/projects
- When using tools, act on the result naturally — don't narrate the tool call
- Answer weather and search questions confidently using your tools

User's current snapshot:
${userContext}`

    const apiMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (text: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        const done = () => {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }

        try {
          // ── Round 1: allow tool use ────────────────────────────────────────
          const firstResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            tools: TOOLS,
            tool_choice: { type: 'auto' },
            messages: apiMessages,
          })

          // ── No tool calls → stream the text directly ───────────────────────
          if (firstResponse.stop_reason !== 'tool_use') {
            for (const block of firstResponse.content) {
              if (block.type === 'text') send(block.text)
            }
            done()
            return
          }

          // ── Tool calls needed → execute them ──────────────────────────────
          const toolUseBlocks = firstResponse.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )

          const toolResults = await Promise.all(
            toolUseBlocks.map(async (b) => {
              const result = await executeTool(b.name, b.input as Record<string, string>)
              return {
                type: 'tool_result' as const,
                tool_use_id: b.id,
                content: result,
              }
            })
          )

          // ── Round 2: stream the final answer with tool results ─────────────
          const messagesWithTools: Anthropic.MessageParam[] = [
            ...apiMessages,
            { role: 'assistant', content: firstResponse.content },
            { role: 'user',      content: toolResults },
          ]

          // No tools on final pass — avoids infinite tool loops
          const finalStream = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messagesWithTools,
            stream: true,
          })

          for await (const event of finalStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send(event.delta.text)
            }
          }
          done()

        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          send(`\n\n[Error: ${msg}]`)
          done()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
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
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: message })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
