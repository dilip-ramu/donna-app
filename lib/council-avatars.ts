// ── Council Avatar Store ───────────────────────────────────────────────────────
// Stores avatar photos as public URLs in Supabase Storage.
// A localStorage cache holds the public URL so reads are instant (no network).
// Uses a custom DOM event to keep all MemberAvatar instances in sync
// without requiring a context provider.

import type { MemberId } from '@/types/council/member'
import { createClient } from '@/lib/supabase/client'

export type AvatarOwnerId = MemberId | 'user'

export const AVATAR_UPDATED_EVENT = 'donna-council-avatar-updated'
export const BUCKET = 'council-avatars'

function storageKey(id: AvatarOwnerId): string {
  return `donna_council_avatar_${id}`
}

/**
 * Read the cached public URL from localStorage.
 * If the cached value is a legacy data URL (starts with "data:"),
 * clear it and return null so callers fall back to building the Supabase URL.
 */
export function getCachedAvatarUrl(id: AvatarOwnerId): string | null {
  if (typeof window === 'undefined') return null
  const cached = localStorage.getItem(storageKey(id))
  if (!cached) return null
  if (cached.startsWith('data:')) {
    // Stale legacy data URL — evict it so we fall back to Supabase URL
    localStorage.removeItem(storageKey(id))
    return null
  }
  return cached
}

/**
 * Construct the Supabase Storage public URL for a member avatar.
 * This is synchronous and does NOT hit the network.
 */
export function buildAvatarUrl(userId: string, id: AvatarOwnerId): string {
  if (!userId) return ''
  const supabase = createClient()
  const path = `${userId}/${id}.jpg`
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Populate the localStorage cache for all given avatar IDs without network.
 * Called once on mount so subsequent reads are instant.
 */
export async function preloadAvatarUrls(userId: string, ids: AvatarOwnerId[]): Promise<void> {
  if (typeof window === 'undefined' || !userId) return
  for (const id of ids) {
    if (!getCachedAvatarUrl(id)) {
      const url = buildAvatarUrl(userId, id)
      if (url) localStorage.setItem(storageKey(id), url)
    }
  }
}

/**
 * Upload a base64 data URL to Supabase Storage, then cache the public URL in
 * localStorage and broadcast the change to all mounted MemberAvatar instances.
 * Returns the public URL on success.
 */
export async function uploadAvatar(
  userId: string,
  id: AvatarOwnerId,
  dataUrl: string,
): Promise<string> {
  const supabase = createClient()
  const blob = await fetch(dataUrl).then(r => r.blob())
  const path = `${userId}/${id}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl

  // Cache public URL (replaces any previous value, including old data URLs)
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(id), publicUrl)
  }

  // Broadcast so all mounted avatar components refresh simultaneously
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { id } })
    )
  }

  return publicUrl
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
