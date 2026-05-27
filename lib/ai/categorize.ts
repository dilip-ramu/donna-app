'use server'

import { runAI, parseJSONResponse } from './client'
import { buildCategorizePrompt } from './prompts/categorize'
import type { CategorizationResult } from '@/lib/types'

const FALLBACK: CategorizationResult = {
  category: 'note',
  urgency: 'medium',
  title: '',
  project_hint: null,
  project_id: null,
  deadline: null,
  entities: { people: [], companies: [], amounts: [], dates: [] },
  action_items: [],
  confidence: 0,
  summary: '',
}

export async function categorizeInboxItem(
  rawContent: string,
  existingProjects: { id: string; title: string }[] = []
): Promise<CategorizationResult> {
  try {
    const prompt = buildCategorizePrompt(rawContent, existingProjects)

    const result = await runAI<CategorizationResult>(
      prompt,
      'fast',
      (text) => {
        const parsed = parseJSONResponse<CategorizationResult>(text)

        // Validate required fields
        if (!parsed.category || !parsed.urgency) {
          throw new Error('Invalid AI response: missing required fields')
        }

        return {
          ...FALLBACK,
          ...parsed,
          title: parsed.title || rawContent.slice(0, 80),
        }
      }
    )

    return result
  } catch (err) {
    console.error('[AI:categorize] Failed:', err)
    return {
      ...FALLBACK,
      title: rawContent.slice(0, 80),
      summary: rawContent,
    }
  }
}
