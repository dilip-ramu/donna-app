import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign In' }

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="min-h-screen bg-donna-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-donna-gold flex items-center justify-center mx-auto mb-4 shadow-hover">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-donna-text mb-1">
            Donna
          </h1>
          <p className="text-donna-muted text-sm">Your personal cognitive infrastructure.</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-donna-muted">
          A private tool. Access by invitation only.
        </p>
      </div>
    </main>
  )
}
