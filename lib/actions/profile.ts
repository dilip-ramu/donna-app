'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateDisplayName(displayName: string): Promise<{ error?: string }> {
  const name = displayName.trim()
  if (!name) return { error: 'Name cannot be empty.' }
  if (name.length > 60) return { error: 'Name must be 60 characters or fewer.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await (supabase as any)
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message ?? 'Failed to update name.' }

  // Revalidate pages that show the display name
  revalidatePath('/', 'layout')
  return {}
}
