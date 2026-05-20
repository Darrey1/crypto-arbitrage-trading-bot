import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

function LoginFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="rounded-2xl px-5 py-4 text-sm"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-3)',
        }}
      >
        Loading sign in...
      </div>
    </div>
  )
}

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[]
  }>
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams

  const nextPath = Array.isArray(params?.next)
    ? params.next[0]
    : params?.next

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm nextPath={nextPath} />
    </Suspense>
  )
}