import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Ensure profile exists
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            display_name: user.email?.split('@')[0] ?? null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          } as ProfileInsert,
          { onConflict: 'id' }
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
