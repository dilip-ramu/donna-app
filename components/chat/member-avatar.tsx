'use client'

import { useState, useEffect } from 'react'
import { getMember } from '@/services/council/member-registry'
import {
  getCachedAvatarUrl,
  buildAvatarUrl,
  AVATAR_UPDATED_EVENT,
} from '@/lib/council-avatars'
import type { MemberId } from '@/types/council/member'
import type { AvatarOwnerId } from '@/lib/council-avatars'

interface MemberAvatarProps {
  memberId: MemberId
  userId?: string
  size?: 'sm' | 'md' | 'lg'
  showRing?: boolean
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 26, md: 32, lg: 52 }
const FONT_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 10, md: 12, lg: 18 }

export default function MemberAvatar({ memberId, userId = '', size = 'sm', showRing = false }: MemberAvatarProps) {
  const member = getMember(memberId)
  const px     = SIZE_PX[size]
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  // Hydrate from cache (or build Supabase URL) after mount — avoids SSR mismatch
  useEffect(() => {
    const cached = getCachedAvatarUrl(memberId)
    if (cached) {
      setPhotoUrl(cached)
    } else if (userId) {
      const url = buildAvatarUrl(userId, memberId)
      if (url) setPhotoUrl(url)
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: AvatarOwnerId }>).detail
      if (detail.id === memberId) {
        const fresh = getCachedAvatarUrl(memberId)
        if (fresh) {
          setPhotoUrl(fresh)
        } else if (userId) {
          setPhotoUrl(buildAvatarUrl(userId, memberId))
        }
      }
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handler)
  }, [memberId, userId])

  // Effective src: Supabase upload → static public-folder image → null (show initial)
  const src = photoUrl ?? member.avatarPath ?? null

  const ringStyle = showRing
    ? { boxShadow: `0 0 0 2px var(--c-surface), 0 0 0 3px ${member.accentColor}44` }
    : {}

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold select-none"
      style={{
        width:         px,
        height:        px,
        background:    src ? 'transparent' : member.accentColor,
        fontSize:      FONT_PX[size],
        color:         '#fff',
        letterSpacing: '0.03em',
        ...ringStyle,
      }}
      title={`${member.name} — ${member.role}`}
    >
      {src ? (
        <img
          src={src}
          alt={member.name}
          onError={() => setPhotoUrl(null)}
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
  userId?: string
}

export function UserAvatar({ size = 'sm', displayName, userId = '' }: UserAvatarProps) {
  const px      = SIZE_PX[size]
  const initial = (displayName ?? 'U')[0].toUpperCase()
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null)
  const [staticFailed, setStaticFailed] = useState(false)

  // Static fallback: try /{displayName}.JPG (e.g. /Dilip.JPG)
  const staticPath = displayName && !staticFailed ? `/${displayName}.JPG` : null

  useEffect(() => {
    const cached = getCachedAvatarUrl('user')
    if (cached) {
      setPhotoUrl(cached)
    } else if (userId) {
      const url = buildAvatarUrl(userId, 'user')
      if (url) setPhotoUrl(url)
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: AvatarOwnerId }>).detail
      if (detail.id === 'user') {
        const fresh = getCachedAvatarUrl('user')
        if (fresh) {
          setPhotoUrl(fresh)
        } else if (userId) {
          setPhotoUrl(buildAvatarUrl(userId, 'user'))
        }
      }
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handler)
  }, [userId])

  // Priority: Supabase upload → /Dilip.JPG → initials
  const src = photoUrl ?? staticPath ?? null

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold select-none"
      style={{
        width:      px,
        height:     px,
        background: src ? 'transparent' : 'var(--c-text)',
        fontSize:   FONT_PX[size],
        color:      'var(--c-surface)',
        letterSpacing: '0.03em',
      }}
      title="You"
    >
      {src ? (
        <img
          src={src}
          alt={displayName ?? 'You'}
          onError={() => {
            if (src === photoUrl) setPhotoUrl(null)  // Supabase URL 404'd
            else setStaticFailed(true)               // /Dilip.JPG 404'd
          }}
          style={{ width: px, height: px, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initial
      )}
    </div>
  )
}
