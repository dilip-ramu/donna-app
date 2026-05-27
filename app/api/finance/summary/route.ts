import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFinanceSummary, getRecoverablesSummary } from '@/services/vaultr/finance'
import { resolveVaultrUserId } from '@/services/vaultr/db'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve Vaultr user ID — different Supabase project, matched by email
  const vaultrUserId = await resolveVaultrUserId(user.email)
  if (!vaultrUserId) {
    // Not an error — just means Vaultr isn't connected yet
    return NextResponse.json({ summary: null, recoverables: null })
  }

  const [summary, recoverables] = await Promise.all([
    getFinanceSummary(vaultrUserId).catch(() => null),
    getRecoverablesSummary(vaultrUserId).catch(() => null),
  ])

  return NextResponse.json({ summary, recoverables })
}
