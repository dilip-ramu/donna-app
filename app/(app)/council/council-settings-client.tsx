'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, Check, Trash2, Zap, BarChart2, Brain, type LucideIcon } from 'lucide-react'
import {
  getAvatarUrl, setAvatarUrl, compressAvatar, AVATAR_UPDATED_EVENT,
} from '@/lib/council-avatars'
import type { AvatarOwnerId } from '@/lib/council-avatars'

// ── Avatar upload button ───────────────────────────────────────────────────────

interface AvatarUploaderProps {
  id: AvatarOwnerId
  name: string
  accentColor: string
  initial: string
  size?: number   // px, default 80
}

function AvatarUploader({ id, name, accentColor, initial, size = 80 }: AvatarUploaderProps) {
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
    if (!file.type.startsWith('image/')) { setError('Image files only.'); return }
    setUploading(true); setError(null)
    try {
      const dataUrl = await compressAvatar(file, 260)
      setAvatarUrl(id, dataUrl)
      setFlash(true)
      setTimeout(() => setFlash(false), 1800)
    } catch {
      setError('Could not process this image.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const s = size

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar circle — click to upload */}
      <div className="relative group">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative block rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ '--tw-ring-color': accentColor, width: s, height: s } as React.CSSProperties}
          aria-label={`Upload photo for ${name}`}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center font-bold"
            style={{
              background: photoUrl ? 'transparent' : accentColor,
              color: '#fff',
              fontSize:   Math.round(s * 0.35),
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
            ) : (
              initial
            )}
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            {uploading ? (
              <div className="border-2 border-white border-t-transparent rounded-full animate-spin" style={{ width: s*0.28, height: s*0.28 }} />
            ) : flash ? (
              <Check style={{ width: s*0.28, height: s*0.28 }} className="text-white" strokeWidth={2.5} />
            ) : (
              <Camera style={{ width: s*0.28, height: s*0.28 }} className="text-white" />
            )}
          </div>
        </button>

        {/* Flash ring */}
        {flash && (
          <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: accentColor }} />
        )}
      </div>

      {/* Upload / Remove actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[11px] text-donna-muted hover:text-donna-text transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Camera size={10} />
          {photoUrl ? 'Change' : 'Upload'}
        </button>
        {photoUrl && (
          <>
            <span className="text-donna-subtle text-[11px]">·</span>
            <button
              onClick={() => setAvatarUrl(id, null)}
              className="text-[11px] text-donna-subtle hover:text-[#EF4444] transition-colors flex items-center gap-1"
            >
              <Trash2 size={10} />
              Remove
            </button>
          </>
        )}
      </div>

      {error && <p className="text-[10px] text-[#EF4444]">{error}</p>}
    </div>
  )
}

// ── Member profile card ────────────────────────────────────────────────────────

interface ExpertiseTag {
  label: string
}

interface MemberProfile {
  id: AvatarOwnerId
  name: string
  role: string
  accentColor: string
  accentBg: string
  initial: string
  tagline: string
  description: string
  expertise: ExpertiseTag[]
  activatesWhen: string
  Icon: LucideIcon
  alwaysOn?: boolean
}

const PROFILES: MemberProfile[] = [
  {
    id:          'donna',
    name:        'Donna',
    role:        'Chief of Staff',
    accentColor: '#7C3AED',
    accentBg:    'rgba(124,58,237,0.07)',
    initial:     'D',
    tagline:     'Your right hand. Always in the room.',
    description: 'Donna knows your work, your priorities, and your patterns. She synthesises context from across your day — tasks, inbox, projects — and gives you a grounded response without needing to be asked twice. She coordinates the other members when needed.',
    expertise:   [
      { label: 'Task & Priority' },
      { label: 'Context Synthesis' },
      { label: 'Day Management' },
      { label: 'Follow-ups' },
    ],
    activatesWhen: 'Every message — Donna is always in the conversation.',
    Icon:          Zap,
    alwaysOn:      true,
  },
  {
    id:          'professor',
    name:        'Professor',
    role:        'Planning Intelligence',
    accentColor: '#1D4ED8',
    accentBg:    'rgba(29,78,216,0.07)',
    initial:     'P',
    tagline:     'Plans from first principles. No fluff.',
    description: "The Professor thinks in systems — sequences, dependencies, failure points. He's stepped back from the day-to-day and sees the structure underneath. When you're planning a rollout, setting a timeline, or sequencing complex work, he lays it out clearly and calls out what will go wrong first.",
    expertise:   [
      { label: 'Roadmaps & Phases' },
      { label: 'Risk & Dependencies' },
      { label: 'Execution Strategy' },
      { label: 'Sequencing' },
    ],
    activatesWhen: 'Joins when you mention planning, strategy, milestones, rollouts, or deadlines.',
    Icon:          Brain,
  },
  {
    id:          'aega',
    name:        'Aega',
    role:        'Finance Intelligence',
    accentColor: '#059669',
    accentBg:    'rgba(5,150,105,0.07)',
    initial:     'A',
    tagline:     'Leads with numbers. No padding.',
    description: "Aega handles the money side — expenses, invoices, what's owed, what's overdue, cash flow. Sharp and efficient, she says what the data says and flags what's wrong. Log an expense in plain English and she'll confirm and record it, learning your preferred accounts so you never have to repeat yourself.",
    expertise:   [
      { label: 'Expense Logging' },
      { label: 'Invoice Tracking' },
      { label: 'Recoverables' },
      { label: 'Cash Flow' },
    ],
    activatesWhen: 'Joins when you mention payments, expenses, invoices, amounts, or financial terms.',
    Icon:          BarChart2,
  },
]

function MemberCard({ profile }: { profile: MemberProfile }) {
  const { id, name, role, accentColor, accentBg, initial, tagline, description, expertise, activatesWhen, Icon, alwaysOn } = profile

  return (
    <div
      className="page-card overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex gap-5 p-5 sm:p-6">

        {/* Left: avatar */}
        <div className="shrink-0 flex flex-col items-center pt-1">
          <AvatarUploader id={id} name={name} accentColor={accentColor} initial={initial} size={72} />
        </div>

        {/* Right: profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-donna-text leading-tight">{name}</h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: accentColor }}>{role}</p>
            </div>

            {alwaysOn ? (
              <span
                className="shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: accentBg, color: accentColor }}
              >
                Always on
              </span>
            ) : (
              <div
                className="shrink-0 mt-0.5 w-2 h-2 rounded-full"
                style={{ background: accentColor, opacity: 0.5 }}
              />
            )}
          </div>

          <p className="text-xs text-donna-muted mt-2 leading-relaxed">{tagline}</p>
          <p className="text-xs text-donna-subtle mt-1.5 leading-relaxed">{description}</p>

          {/* Expertise pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {expertise.map(tag => (
              <span
                key={tag.label}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                style={{
                  background:   accentBg,
                  color:        accentColor,
                  borderColor:  `${accentColor}33`,
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* When it activates */}
          <div className="mt-3 flex items-start gap-1.5">
            <Icon size={11} className="shrink-0 mt-0.5" style={{ color: accentColor } as React.CSSProperties} />
            <p className="text-[11px] text-donna-subtle leading-snug">{activatesWhen}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Your card ─────────────────────────────────────────────────────────────────

function YourCard() {
  return (
    <div className="page-card p-5 sm:p-6 flex items-center gap-5" style={{ borderLeft: '3px solid #6B7280' }}>
      <div className="shrink-0">
        <AvatarUploader id="user" name="You" accentColor="#6B7280" initial="Y" size={56} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-donna-text">You</h2>
        <p className="text-xs text-donna-subtle mt-1 leading-relaxed max-w-sm">
          Your photo appears on your own messages in the council chat. Upload anything — it stays on this device only.
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CouncilSettingsClient() {
  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-donna-text">Your Council</h1>
        <p className="text-sm text-donna-muted mt-1.5 leading-relaxed max-w-lg">
          Three specialists — one conversation. Each member brings a different intelligence to the table.
          They join automatically based on what you're working on.
        </p>
      </div>

      {/* Member profiles */}
      <div className="flex flex-col gap-4">
        {PROFILES.map(profile => (
          <MemberCard key={profile.id} profile={profile} />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-donna-border" />

      {/* Your card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-donna-muted">Your presence</h2>
        <YourCard />
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-donna-subtle leading-relaxed pb-4">
        Photos are stored locally on this device and are never uploaded to any server.
        Clearing browser storage will remove them.
      </p>
    </div>
  )
}
