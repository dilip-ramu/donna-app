'use client'

import { useState } from 'react'
import MobileNav from './mobile-nav'
import MobileChatSheet from './mobile-chat-sheet'

interface MobileShellProps {
  rightPanel: React.ReactNode
  children: React.ReactNode
}

export default function MobileShell({ rightPanel, children }: MobileShellProps) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      {/* Page content — pad bottom for nav bar */}
      <main
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        <div
          className="w-full min-h-full flex flex-col"
          style={{ padding: 'clamp(16px, 2.5vw, 28px)' }}
        >
          {children}
        </div>
      </main>

      {/* Bottom nav */}
      <MobileNav onChatOpen={() => setChatOpen(true)} chatOpen={chatOpen} />

      {/* Chat slide-up sheet */}
      <MobileChatSheet open={chatOpen} onClose={() => setChatOpen(false)}>
        {rightPanel}
      </MobileChatSheet>
    </>
  )
}
