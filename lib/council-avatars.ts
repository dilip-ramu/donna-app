// ── Council Avatar Store ───────────────────────────────────────────────────────
// Stores avatar photos (as compressed data URLs) in localStorage.
// Uses a custom DOM event to keep all MemberAvatar instances in sync
// without requiring a context provider.

import type { MemberId } from '@/types/council/member'

export type AvatarOwnerId = MemberId | 'user'

export const AVATAR_UPDATED_EVENT = 'donna-council-avatar-updated'

function storageKey(id: AvatarOwnerId): string {
  return `donna_council_avatar_${id}`
}

/** Read the stored data URL for a member/user (returns null if not set). */
export function getAvatarUrl(id: AvatarOwnerId): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(storageKey(id))
}

const ALL_AVATAR_IDS: AvatarOwnerId[] = ['donna', 'professor', 'aega', 'user']

/** Persist a data URL and broadcast the change to all mounted components. */
export function setAvatarUrl(id: AvatarOwnerId, dataUrl: string | null): void {
  if (typeof window === 'undefined') return
  if (dataUrl) {
    try {
      localStorage.setItem(storageKey(id), dataUrl)
    } catch {
      // Storage quota — evict all OTHER avatars to make room, then retry once
      console.warn('[council-avatars] quota exceeded — evicting others and retrying')
      for (const otherId of ALL_AVATAR_IDS) {
        if (otherId !== id) localStorage.removeItem(storageKey(otherId))
      }
      try {
        localStorage.setItem(storageKey(id), dataUrl)
      } catch {
        console.error('[council-avatars] still failed after eviction — image too large')
        return
      }
    }
  } else {
    localStorage.removeItem(storageKey(id))
  }
  window.dispatchEvent(
    new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { id } })
  )
}

/** Compress and centre-crop a File to a square JPEG data URL. */
export async function compressAvatar(file: File, size = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }

      // Centre-crop to square
      const shorter = Math.min(img.width, img.height)
      const sx = (img.width  - shorter) / 2
      const sy = (img.height - shorter) / 2
      ctx.drawImage(img, sx, sy, shorter, shorter, 0, 0, size, size)

      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image failed to load'))
    }
    img.src = objectUrl
  })
}
