'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, User } from 'lucide-react'
import { updateDisplayName } from '@/lib/actions/profile'

interface ProfileFormProps {
  currentName: string
  email: string
}

export default function ProfileForm({ currentName, email }: ProfileFormProps) {
  const [name, setName] = useState(currentName)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const isDirty = name.trim() !== currentName && name.trim() !== ''
  const isWorking = isPending

  const handleSave = () => {
    if (!isDirty || isWorking) return
    setStatus('idle')
    startTransition(async () => {
      const result = await updateDisplayName(name.trim())
      if (result.error) {
        setErrorMsg(result.error)
        setStatus('error')
      } else {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setName(currentName)
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-donna-muted mb-1.5">
        Display name
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-donna-muted pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setStatus('idle') }}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            maxLength={60}
            className="w-full pl-8 pr-3 py-2 bg-donna-surface border border-donna-border rounded-xl
                       text-sm text-donna-text placeholder:text-donna-muted outline-none
                       focus:ring-2 focus:ring-donna-rose/20 focus:border-donna-rose/40 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || isWorking}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={isDirty && !isWorking
            ? { background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', color: 'white' }
            : { background: '#F0EEE9', color: '#78716C' }
          }
        >
          {isWorking
            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
            : status === 'saved'
            ? <><Check size={12} /> Saved</>
            : 'Save'
          }
        </button>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>
      )}
      {status === 'saved' && (
        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
          <Check size={11} /> Name updated — changes are reflected everywhere.
        </p>
      )}

      {/* Email (read-only) */}
      <div className="mt-4">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-donna-muted mb-1.5">
          Email
        </label>
        <p className="text-sm text-donna-muted bg-donna-elevated border border-donna-border
                      rounded-xl px-3 py-2 max-w-xs">
          {email}
        </p>
        <p className="text-[11px] text-donna-muted/60 mt-1">Your login email — contact support to change this.</p>
      </div>
    </div>
  )
}
