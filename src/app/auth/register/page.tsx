'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const strength = checks.filter(Boolean).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500']
  const textColors = ['', 'text-red-400', 'text-amber-400', 'text-yellow-400', 'text-emerald-400']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-all duration-300',
              i <= strength ? colors[strength] : ''
            )}
            style={i > strength ? { background: 'var(--border-subtle)' } : undefined}
          />
        ))}
      </div>
      <span className={cn('text-[10px] font-medium', textColors[strength])}>
        {labels[strength]}
      </span>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (!agreed) { setError('Please accept the terms.'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 1300))
    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden grid-pattern py-12"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,189,116,0.05) 0%, transparent 70%)' }}
      />

      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center glow-purple">
          <Activity className="w-3.5 h-3.5 text-[#070707]" strokeWidth={2.5} />
        </div>
        <span className="font-bold gradient-text text-base">ArbMatrix</span>
      </Link>

      <div className="relative w-full max-w-[380px]">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>
              Create account
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Start with $10,000 paper trading balance
            </p>
          </div>

          {/* Paper mode notice */}
          <div
            className="mb-5 px-3.5 py-3 rounded-xl flex items-start gap-2.5"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <p className="text-xs text-amber-400/90 leading-relaxed">
              New accounts start in <strong className="text-amber-400">Paper Trading</strong> mode — virtual funds, zero risk.
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Full Name
              </label>
              <div className="relative">
                <User
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-base pl-9"
                  placeholder="John Trader"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>
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
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
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
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  className={cn(
                    'input-base pl-9',
                    form.confirm && form.confirm !== form.password && 'border-red-500/50 focus:border-red-500/60'
                  )}
                  placeholder="••••••••"
                  required
                />
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p className="text-[10px] text-red-400 mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="w-3.5 h-3.5 mt-0.5 rounded flex-shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <label htmlFor="terms" className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                I agree to the{' '}
                <a href="#" className="font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="#" className="font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
                  Risk Disclosure
                </a>
              </label>
            </div>

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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
