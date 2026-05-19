'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Mail, Lock, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 1100))
    if (form.email && form.password) {
      router.push('/dashboard')
    } else {
      setError('Please enter your email and password.')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden grid-pattern"
      style={{ background: 'var(--bg)' }}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,189,116,0.05) 0%, transparent 70%)' }}
      />

      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center glow-purple">
          <Activity className="w-3.5 h-3.5 text-[#070707]" strokeWidth={2.5} />
        </div>
        <span className="font-bold gradient-text text-base">ArbMatrix</span>
      </Link>

      {/* Card */}
      <div className="relative w-full max-w-[380px]">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
              Sign in
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Access your ArbMatrix dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-2)' }}
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-base pl-9"
                  placeholder="trader@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-base pl-9 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-3)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember"
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <label htmlFor="remember" className="text-xs" style={{ color: 'var(--text-3)' }}>
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
           <button
            type="submit"
            disabled={loading}
            className={cn(
              'relative w-full h-12 rounded-xl font-semibold text-sm mt-1 flex items-center justify-center gap-2 transition-all duration-200',
              'bg-[var(--accent)] text-[#070707] hover:brightness-110 active:scale-[0.98]',
              loading && 'opacity-60 cursor-not-allowed'
            )}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#070707]/30 border-t-[#070707] rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border-subtle)' }} />
            </div>
            <div className="relative text-center">
              <span
                className="px-3 text-xs"
                style={{ background: 'var(--surface)', color: 'var(--text-3)' }}
              >
                or continue with
              </span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            className={cn(
              'w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-all duration-200',
              'bg-white/5 border border-white/10 text-[var(--text-1)] hover:bg-white/10 active:scale-[0.98]'
            )}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-3)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text-3)' }}>
          Demo: enter any email + password to access the dashboard
        </p>
      </div>
    </div>
  )
}
