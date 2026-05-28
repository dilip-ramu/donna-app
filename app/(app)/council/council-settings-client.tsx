'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, Trash2, Check, Upload } from 'lucide-react'
import {
  getAvatarUrl, setAvatarUrl, compressAvatar, AVATAR_UPDATED_EVENT,
} from '@/lib/council-avatars'
import { getMember, MEMBER_LIST } from '@/services/council/member-registry'
import type { AvatarOwnerId } from '@/lib/council-avatars'
import type { MemberId } from '@/types/council/member'

// ── Avatar Card ────────────────────────────────────────────────────────────────

interface AvatarCardProps {
  id: AvatarOwnerId
  name: string
  role: string
  description: string
  accentColor: string
  initial: string
}

function AvatarCard({ id, name, role, description, accentColor, initial }: AvatarCardProps) {
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [flash, setFlash]         = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPhotoUrl(getAvatarUrl(id))
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: AvatarOwnerId }>).detail
      if (detail.id === id) setPhotoUrl(getAvatarUrl(id))
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handler)
  }, [id])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }

    setUploading(true)
    setError(null)
    try {
      const dataUrl = await compressAvatar(file, 260)
      setAvatarUrl(id, dataUrl)
      setFlash(true)
      setTimeout(() => setFlash(false), 1800)
    } catch {
      setError('Could not process this image. Try another file.')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    setAvatarUrl(id, null)
  }

  return (
    <div
      className="page-card p-5 flex flex-col items-center gap-4 text-center transition-shadow hover:shadow-md"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      {/* Avatar + upload trigger */}
      <div className="relative group">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative block rounded-full overflow-hidden focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          aria-label={`Upload photo for ${name}`}
        >
          {/* Avatar circle */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl"
            style={{
              background: photoUrl ? 'transparent' : accentColor,
              color:      '#fff',
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="w-24 h-24 object-cover rounded-full"
              />
            ) : (
              initial
            )}
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : flash ? (
              <Check size={22} className="text-white" strokeWidth={2.5} />
            ) : (
              <Camera size={22} className="text-white" />
            )}
          </div>
        </button>

        {/* Flash ring when saved */}
        {flash && (
          <div
            className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{ borderColor: accentColor }}
          />
        )}
      </div>

      {/* Identity */}
      <div>
        <p className="text-sm font-semibold text-donna-text">{name}</p>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: accentColor }}>{role}</p>
        <p className="text-[11px] text-donna-subtle mt-1.5 leading-relaxed max-w-[160px] mx-auto">
          {description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 w-full mt-auto">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium
                     py-2 rounded-xl border border-donna-border text-donna-muted
                     hover:border-donna-text hover:text-donna-text transition-colors disabled:opacity-50"
        >
          <Upload size={11} />
          {photoUrl ? 'Replace photo' : 'Upload photo'}
        </button>

        {photoUrl && (
          <button
            onClick={handleRemove}
            className="w-full flex items-center justify-center gap-1.5 text-[11px]
                       py-1.5 rounded-xl text-donna-subtle hover:text-[#EF4444] transition-colors"
          >
            <Trash2 size={11} />
            Remove
          </button>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-[#EF4444] mt-1">{error}</p>
      )}
    </div>
  )
}

// ── Member card configs ────────────────────────────────────────────────────────

const USER_CARD = {
  id:          'user' as AvatarOwnerId,
  name:        'You',
  role:        'Principal',
  description: 'Your photo appears on your own messages in the council chat.',
  accentColor: '#7C3AED',
  initial:     'U',
}

const MEMBER_CARDS = MEMBER_LIST.map(m => ({
  id:          m.id as AvatarOwnerId,
  name:        m.name,
  role:        m.role,
  accentColor: m.accentColor,
  initial:     m.initial,
  description:
    m.id === 'donna'     ? 'Chief of Staff — orchestration, context, and day management.' :
    m.id === 'professor' ? 'Planning Intelligence — roadmaps, phases, dependencies, execution strategy.' :
    m.id === 'aega'      ? 'Finance Intelligence — expenses, invoices, recoverables, and cash flow.' :
    '',
}))

// ── Page client ────────────────────────────────────────────────────────────────

export default function CouncilSettingsClient() {
  const allCards = [USER_CARD, ...MEMBER_CARDS]

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-donna-text">Council Avatars</h1>
        <p className="text-sm text-donna-muted mt-1 leading-relaxed">
          Upload a photo for yourself and each council member. Photos are stored on this device.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {allCards.map(card => (
          <AvatarCard key={card.id} {...card} />
        ))}
      </div>

      {/* Note */}
      <p className="text-[11px] text-donna-subtle leading-relaxed">
        Photos are compressed and stored locally in your browser. They are not uploaded to any server.
        Clearing browser data will remove them.
      </p>
    </div>
  )
}
