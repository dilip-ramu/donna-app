'use client'

import MemberAvatar from './member-avatar'
import type { MemberId } from '@/types/council/member'
import { getMember } from '@/services/council/member-registry'

interface TypingIndicatorProps {
  memberId: MemberId
}

export default function TypingIndicator({ memberId }: TypingIndicatorProps) {
  const member = getMember(memberId)

  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <MemberAvatar memberId={memberId} size="sm" />
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium px-0.5" style={{ color: member.accentColor }}>
          {member.name}
        </span>
        <div
          className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm"
          style={{ background: `color-mix(in srgb, ${member.accentColor} 12%, var(--c-elevated))` }}
        >
          {[0, 140, 280].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background:      member.accentColor,
                opacity:         0.7,
                animationDelay:  `${delay}ms`,
                animationDuration: '1.1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
