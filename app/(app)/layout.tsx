import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/donna/sidebar'
import RightPanel from '@/components/donna/right-panel'
import MobileShell from '@/components/donna/mobile-shell'
import CommandPaletteProvider from '@/components/command/CommandPaletteProvider'
import { InboxItem } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single() as { data: { display_name: string | null } | null }

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'

  // Fetch memory notes and inbox for the right panel
  const [memoryRes, inboxRes] = await Promise.all([
    (supabase as any)
      .from('inbox_items')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .ilike('raw_content', '[memory]%')
      .order('created_at', { ascending: false })
      .limit(20),

    (supabase as any)
      .from('inbox_items')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('raw_content', 'ilike', '[memory]%')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const memoryNotes = (memoryRes.data ?? []) as InboxItem[]
  const inboxItems  = (inboxRes.data ?? []) as InboxItem[]

  const rightPanel = (
    <RightPanel
      userId={user.id}
      memoryNotes={memoryNotes}
      inboxItems={inboxItems}
    />
  )

  return (
    <CommandPaletteProvider>
      <div
        className="flex bg-donna-bg transition-colors duration-200"
        style={{
          height: '100dvh',       // dynamic viewport height — accounts for iOS Safari chrome
          overflow: 'hidden',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >

        {/* ── Left sidebar — desktop only ── */}
        <aside className="hidden md:flex md:flex-col md:shrink-0 md:w-14 lg:w-[200px]">
          <Sidebar displayName={displayName} />
        </aside>

        {/* ── Mobile: shell handles nav + chat sheet ── */}
        <div className="flex md:hidden flex-1 min-w-0 flex-col">
          <MobileShell rightPanel={rightPanel}>
            {children}
          </MobileShell>
        </div>

        {/* ── Desktop: main content + right panel ── */}
        <main className="hidden md:flex flex-1 min-w-0 overflow-y-auto">
          <div
            className="w-full min-h-full flex flex-col"
            style={{ padding: 'clamp(16px, 2.5vw, 28px)' }}
          >
            {children}
          </div>
        </main>

        {/* ── Right panel — desktop only ── */}
        <div className="hidden md:flex">
          {rightPanel}
        </div>

      </div>
    </CommandPaletteProvider>
  )
}
