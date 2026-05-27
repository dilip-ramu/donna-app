import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/settings/ProfileForm'
import ThemeToggle from '@/components/donna/theme-toggle'
import { User, Palette, Bell, Shield, Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings — Donna' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profileRes = await (supabase as any)
    .from('profiles')
    .select('display_name, timezone, preferences')
    .eq('id', user.id)
    .single() as { data: { display_name: string | null; timezone: string } | null }

  const currentName = profileRes.data?.display_name ?? user.email?.split('@')[0] ?? ''
  const email = user.email ?? ''

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">

      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-donna-text">Settings</h1>
        <p className="text-sm text-donna-muted mt-0.5">Manage your account and preferences</p>
      </div>

      {/* ── Profile ── */}
      <section className="page-card">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-donna-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--c-violet)' }}>
            <User size={13} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-donna-text leading-none">Profile</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">How Donna knows you</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--c-violet), #9333EA)' }}
          >
            {currentName.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-base font-semibold text-donna-text leading-none">
              {currentName || 'Set your name'}
            </p>
            <p className="text-xs text-donna-muted mt-0.5">{email}</p>
          </div>
        </div>

        <ProfileForm currentName={currentName} email={email} />
      </section>

      {/* ── Appearance ── */}
      <section className="page-card">
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-donna-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(13,148,136,0.12)', color: '#0D9488' }}>
            <Palette size={13} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-donna-text leading-none">Appearance</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">Theme and display preferences</p>
          </div>
        </div>

        <ThemeToggle variant="full" />
      </section>

      {/* ── Donna AI ── */}
      <section className="page-card opacity-60 pointer-events-none">
        <div className="flex items-center gap-2.5 pb-4 border-b border-donna-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--c-violet)' }}>
            <Zap size={13} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-donna-text leading-none">Donna AI</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">Tone, memory, and AI behaviour</p>
          </div>
          <span className="text-[10px] bg-donna-elevated text-donna-muted px-2 py-0.5 rounded-full">
            coming soon
          </span>
        </div>
        <p className="text-xs text-donna-muted mt-4">
          Personalise how Donna speaks to you, what she remembers, and how she prioritises.
        </p>
      </section>

      {/* ── Notifications ── */}
      <section className="page-card opacity-60 pointer-events-none">
        <div className="flex items-center gap-2.5 pb-4 border-b border-donna-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706' }}>
            <Bell size={13} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-donna-text leading-none">Notifications</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">Reminders, digests, and alerts</p>
          </div>
          <span className="text-[10px] bg-donna-elevated text-donna-muted px-2 py-0.5 rounded-full">
            coming soon
          </span>
        </div>
        <p className="text-xs text-donna-muted mt-4">
          Daily digest timing, overdue alerts, and meeting reminders.
        </p>
      </section>

      {/* ── Security ── */}
      <section className="page-card opacity-60 pointer-events-none">
        <div className="flex items-center gap-2.5 pb-4 border-b border-donna-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
            <Shield size={13} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-donna-text leading-none">Security</h2>
            <p className="text-[11px] text-donna-muted mt-0.5">Password and account security</p>
          </div>
          <span className="text-[10px] bg-donna-elevated text-donna-muted px-2 py-0.5 rounded-full">
            coming soon
          </span>
        </div>
        <p className="text-xs text-donna-muted mt-4">
          Change password, manage sessions, and connected devices.
        </p>
      </section>

    </div>
  )
}
