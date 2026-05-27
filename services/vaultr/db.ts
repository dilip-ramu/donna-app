/**
 * Vaultr DB client — server-side only.
 *
 * Uses the Supabase service role key to read/write Vaultr's tables directly.
 * RLS is bypassed so every call MUST be scoped with .eq('user_id', userId).
 *
 * Required env vars (add to Donna's .env.local):
 *   VAULTR_SUPABASE_URL          — same value as Vaultr's NEXT_PUBLIC_SUPABASE_URL
 *   VAULTR_SERVICE_ROLE_KEY      — Vaultr's service_role secret key
 *   VAULTR_APP_URL               — deployed URL of Vaultr (e.g. https://vaultr.vercel.app)
 */

import { createClient } from '@supabase/supabase-js'

function getVaultrClient() {
  const url = process.env.VAULTR_SUPABASE_URL
  const key = process.env.VAULTR_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Vaultr integration not configured. ' +
      'Set VAULTR_SUPABASE_URL and VAULTR_SERVICE_ROLE_KEY in Donna\'s .env.local'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      },
    },
  })
}

/**
 * Returns a Vaultr Supabase client (service role).
 * Call inside server actions / API routes only — never in client components.
 */
export function vaultrDb() {
  return getVaultrClient()
}

/** Vaultr app base URL for deep links */
export function vaultrUrl(path = ''): string {
  const base = (process.env.VAULTR_APP_URL ?? 'https://inex-mu.vercel.app').replace(/\/$/, '')
  return `${base}${path}`
}

/**
 * Donna and Vaultr are on separate Supabase projects → different user UUIDs.
 * This resolves the Vaultr user ID for a given email address (which is shared
 * between both apps since it's the same human).
 *
 * Result is cached in-process for the lifetime of the serverless function.
 */
const _cache = new Map<string, string>()

export async function resolveVaultrUserId(email: string): Promise<string | null> {
  if (_cache.has(email)) return _cache.get(email)!

  const url = process.env.VAULTR_SUPABASE_URL
  const key = process.env.VAULTR_SERVICE_ROLE_KEY
  if (!url || !key) return null

  try {
    // Use GoTrue admin REST API directly — more reliable than supabase-js admin client
    // when operating across separate Supabase projects.
    const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      },
    })

    if (!res.ok) return null

    const data = await res.json() as { users?: { id: string; email?: string }[] }
    const match = (data.users ?? []).find(u => u.email === email)
    if (!match) return null

    _cache.set(email, match.id)
    return match.id
  } catch {
    return null
  }
}
