import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json() as { content: string }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('inbox_items')
      .insert({
        user_id: user.id,
        raw_content: content.trim(),
        source: 'manual',
        status: 'unprocessed',
      })
      .select('id')
      .single() as { data: { id: string } | null; error: { message: string } | null }

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    }

    // Trigger AI categorization in background
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${appUrl}/api/ai/process-inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: data.id }),
    }).catch(() => { /* fire-and-forget */ })

    return NextResponse.json({ itemId: data.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
