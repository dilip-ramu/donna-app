import { createClient } from '@/lib/supabase/server'
import { getInboxItems } from '@/lib/actions/inbox'
import InboxClient from '@/components/inbox/InboxClient'

export const metadata = { title: 'Inbox' }

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const items = await getInboxItems(100)

  return <InboxClient initialItems={items} userId={user.id} />
}
