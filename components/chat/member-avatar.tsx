'use client'

import { getMember } from '@/services/council/member-registry'
import type { MemberId } from '@/types/council/member'

interface MemberAvatarProps {
  memberId: MemberId
  size?: 'sm' | 'md'
  showRing?: boolean
}

export default function MemberAvatar({ memberId, size = 'sm', showRing = false }: MemberAvatarProps) {
  const member = getMember(memberId)
  const px = size === 'sm' ? 26 : 32

  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-semibold select-none"
      style={{
        width:  px,
        height: px,
        background:  member.accentColor,
        fontSize:    size === 'sm' ? 10 : 12,
        color:       '#fff',
        boxShadow:   showRing ? `0 0 0 2px var(--c-surface), 0 0 0 3px ${member.accentColor}33` : undefined,
        letterSpacing: '0.03em',
      }}
      title={`${member.name} — ${member.role}`}
    >
      {member.initial}
    </div>
  )
}
