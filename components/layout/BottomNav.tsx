'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Inbox, CheckSquare, Lightbulb, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const BOTTOM_ITEMS = [
  { href: '/',      label: 'Today',  icon: Home },
  { href: '/inbox', label: 'Inbox',  icon: Inbox },
  { href: '/tasks', label: 'Tasks',  icon: CheckSquare },
  { href: '/ideas', label: 'Ideas',  icon: Lightbulb },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center
                    bg-donna-surface border-t border-donna-border pb-safe z-40">
      {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 flex-1 py-3 text-[10px] font-medium transition-colors',
              active ? 'text-donna-gold' : 'text-donna-muted'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
            {label}
          </Link>
        )
      })}

      {/* More */}
      <button className="flex flex-col items-center gap-1 flex-1 py-3 text-[10px] font-medium text-donna-muted">
        <MoreHorizontal size={20} strokeWidth={1.6} />
        More
      </button>
    </nav>
  )
}
