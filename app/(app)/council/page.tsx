import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CouncilSettingsClient from './council-settings-client'

export const metadata = { title: 'Your Council — Donna' }

export default async function CouncilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <CouncilSettingsClient userId={user.id} />
}
