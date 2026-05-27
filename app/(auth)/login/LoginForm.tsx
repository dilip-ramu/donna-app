'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) {
        // Already registered — switch to login automatically
        if (error.message.toLowerCase().includes('already')) {
          setMode('login')
          setError('Account exists — signing you in.')
          setLoading(false)
          return
        }
        setError(error.message)
        setLoading(false)
        return
      }
      // Auto sign-in after signup (email confirm disabled)
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (loginErr) { setError(loginErr.message); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="donna-card p-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs text-donna-muted mb-2 uppercase tracking-wider">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="donna-input w-full text-sm"
          autoComplete="email"
          autoFocus
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs text-donna-muted mb-2 uppercase tracking-wider">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className="donna-input w-full text-sm"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />
      </div>

      {error && (
        <p className={error.includes('signing you in') ? 'text-donna-gold text-xs' : 'text-red-400 text-xs'}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        className="w-full py-2.5 bg-donna-gold text-donna-bg text-sm font-medium rounded-lg
                   hover:bg-donna-gold/90 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? '...' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-center text-xs text-donna-muted">
        {mode === 'signup' ? 'Already have an account?' : 'No account yet?'}{' '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
          className="text-donna-gold hover:underline"
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </form>
  )
}
