import { createClient } from '@/lib/supabase/server'
import CouncilSettingsClient from './council-settings-client'

export const metadata = { title: 'Council Avatars — Donna' }

export default async function CouncilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <CouncilSettingsClient />
}
