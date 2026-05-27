'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CheckSquare, Inbox, Target, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV = [
  { href: '/',       label: 'Home',   icon: Home },
  { href: '/tasks',  label: 'Tasks',  icon: CheckSquare },
  { href: '/inbox',  label: 'Inbox',  icon: Inbox },
  { href: '/focus',  label: 'Focus',  icon: Target },
]

interface MobileNavProps {
  onChatOpen: () => void
  chatOpen: boolean
}

export default function MobileNav({ onChatOpen, chatOpen }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden
                 bg-donna-surface border-t border-donna-border transition-colors duration-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              active ? 'text-donna-violet' : 'text-donna-subtle',
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        )
      })}

      {/* Chat button — opens slide-up sheet */}
      <button
        onClick={onChatOpen}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
          chatOpen ? 'text-donna-violet' : 'text-donna-subtle',
        )}
      >
        <MessageSquare size={20} strokeWidth={chatOpen ? 2.2 : 1.8} />
        Chat
      </button>
    </nav>
  )
}
