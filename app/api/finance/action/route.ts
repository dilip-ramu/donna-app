/**
 * POST /api/finance/action
 *
 * Receives a natural-language finance query from Donna's chat,
 * parses intent, routes to Vaultr service, returns a structured response.
 * Server-side only — API keys never reach the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFinanceIntent } from '@/lib/parsers/finance'
import { routeFinanceIntent } from '@/services/orchestration/router'
import { resolveVaultrUserId } from '@/services/vaultr/db'
import type { FinanceActionResult } from '@/types/contracts/vaultr'

export async function POST(req: NextRequest) {
  // 1. Auth — must be a signed-in Donna user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let body: { text: string; accountId?: string }
  try {
    body = await req.json() as { text: string; accountId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, accountId } = body
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // 3. Resolve Vaultr user ID (different Supabase project → different UUID)
  //    Matched by email — both apps are used by the same person.
  const email = user.email
  if (!email) {
    return NextResponse.json({ error: 'User email not found' }, { status: 400 })
  }

  const vaultrUserId = await resolveVaultrUserId(email)
  if (!vaultrUserId) {
    return NextResponse.json({
      intent: null,
      result: {
        status: 'error',
        message: 'Could not find your account in Vaultr. Make sure you\'re signed up with the same email on both apps.',
      },
    })
  }

  // 4. Parse intent
  const intent = parseFinanceIntent(text.trim())

  // 5. Route to action (using Vaultr's user ID, not Donna's)
  let result: FinanceActionResult
  try {
    result = await routeFinanceIntent(intent, vaultrUserId, { accountId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[finance/action] routing error:', msg)
    result = {
      status: 'error',
      message: 'Something went wrong connecting to Vaultr. Check VAULTR_SUPABASE_URL and VAULTR_SERVICE_ROLE_KEY.',
    }
  }

  // 6. Persist successful creates to Donna's memory (fire-and-forget)
  if (result.status === 'success' && intent.kind.startsWith('create_')) {
    void supabase
      .from('inbox_items')
      .insert({
        user_id:     user.id,
        raw_content: `[finance] ${text.trim()} → ${result.message.slice(0, 120)}`,
      })
  }

  return NextResponse.json({ intent, result })
}
