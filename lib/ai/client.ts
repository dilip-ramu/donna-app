import Anthropic from '@anthropic-ai/sdk'

export const AI_MODELS = {
  fast: 'claude-haiku-4-5-20251001',   // categorize, extract, tag
  deep: 'claude-sonnet-4-6',           // summarize, infer, relate
} as const

export type AIModel = keyof typeof AI_MODELS

// Singleton — module-level, server-only
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

/** Run an AI call with timeout + retry */
export async function runAI<T>(
  prompt: string,
  model: AIModel = 'fast',
  parseResponse: (text: string) => T,
  options: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<T> {
  const { maxRetries = 2, timeoutMs = 15000 } = options
  const client = getAnthropicClient()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const message = await client.messages.create({
        model: AI_MODELS[model],
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      clearTimeout(timer)

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      return parseResponse(text)
    } catch (err) {
      if (attempt === maxRetries) throw err
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))) // backoff
    }
  }

  throw new Error('AI call failed after retries')
}

/** Parse JSON from AI response, handling markdown code blocks */
export function parseJSONResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()
  return JSON.parse(cleaned) as T
}
