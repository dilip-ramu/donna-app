import { createClient } from '@/lib/supabase/server'
import MemoryPageClient from './memory-client'

export const metadata = { title: 'Memory — Donna' }
export const dynamic = 'force-dynamic'

export default async function MemoryPage() {
  // Auth guard only — data is fetched client-side to avoid SSR caching issues
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <MemoryPageClient />
}
