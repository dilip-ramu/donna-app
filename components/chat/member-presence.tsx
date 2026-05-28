'use client'

import MemberAvatar from './member-avatar'
import { getMember, MEMBER_LIST } from '@/services/council/member-registry'
import type { MemberId } from '@/types/council/member'

interface MemberPresenceProps {
  activeMembers?: MemberId[]   // members currently in the conversation
  compact?: boolean
}

export default function MemberPresence({ activeMembers, compact = false }: MemberPresenceProps) {
  const members = activeMembers
    ? activeMembers.map(id => getMember(id))
    : MEMBER_LIST

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {members.map((m, i) => (
          <div key={m.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: members.length - i }}>
            <MemberAvatar memberId={m.id} size="sm" showRing />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {members.map(m => (
        <div key={m.id} className="flex items-center gap-1.5">
          <MemberAvatar memberId={m.id} size="sm" />
          <span className="text-[10px] font-medium" style={{ color: m.accentColor }}>
            {m.name}
          </span>
        </div>
      ))}
    </div>
  )
}
