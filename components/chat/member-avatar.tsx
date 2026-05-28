'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getMember } from '@/services/council/member-registry'
import { getAvatarUrl, AVATAR_UPDATED_EVENT } from '@/lib/council-avatars'
import type { MemberId } from '@/types/council/member'
import type { AvatarOwnerId } from '@/lib/council-avatars'

interface MemberAvatarProps {
  memberId: MemberId
  size?: 'sm' | 'md' | 'lg'
  showRing?: boolean
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 26, md: 32, lg: 52 }
const FONT_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 10, md: 12, lg: 18 }

export default function MemberAvatar({ memberId, size = 'sm', showRing = false }: MemberAvatarProps) {
  const member = getMember(memberId)
  const px     = SIZE_PX[size]
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setPhotoUrl(getAvatarUrl(memberId))

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: AvatarOwnerId }>).detail
      if (detail.id === memberId) setPhotoUrl(getAvatarUrl(memberId))
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handler)
  }, [memberId])

  const ringStyle = showRing
    ? { boxShadow: `0 0 0 2px var(--c-surface), 0 0 0 3px ${member.accentColor}44` }
    : {}

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold select-none"
      style={{
        width:         px,
        height:        px,
        background:    photoUrl ? 'transparent' : member.accentColor,
        fontSize:      FONT_PX[size],
        color:         '#fff',
        letterSpacing: '0.03em',
        ...ringStyle,
      }}
      title={`${member.name} — ${member.role}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={member.name}
          style={{ width: px, height: px, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        member.initial
      )}
    </div>
  )
}

// ── User Avatar ────────────────────────────────────────────────────────────────
// Separate component for the user's own avatar (shown on user chat messages).

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  displayName?: string
}

export function UserAvatar({ size = 'sm', displayName }: UserAvatarProps) {
  const px       = SIZE_PX[size]
  const initial  = (displayName ?? 'U')[0].toUpperCase()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    setPhotoUrl(getAvatarUrl('user'))

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: AvatarOwnerId }>).detail
      if (detail.id === 'user') setPhotoUrl(getAvatarUrl('user'))
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handler)
  }, [])

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold select-none"
      style={{
        width:      px,
        height:     px,
        background: photoUrl ? 'transparent' : 'var(--c-text)',
        fontSize:   FONT_PX[size],
        color:      'var(--c-surface)',
        letterSpacing: '0.03em',
      }}
      title="You"
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="You"
          style={{ width: px, height: px, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initial
      )}
    </div>
  )
}
