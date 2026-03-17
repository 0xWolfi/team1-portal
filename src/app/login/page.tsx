'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api-client'

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}

function LoginContent() {
  const { user, login, loading, refreshUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bhLoading, setBhLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) router.push(redirect)
  }, [user, loading, router, redirect])

  // Listen for Builder Hub popup callback
  const handleBHMessage = useCallback(async (event: MessageEvent) => {
    // In production, check event.origin against BUILDER_HUB_URL
    if (event.data?.type !== 'BUILDER_HUB_AUTH') return

    const { token, email: bhEmail, name } = event.data
    setBhLoading(true)
    setError('')

    try {
      const res = await api.post<{ accessToken: string }>('/api/auth/builder-hub', {
        token,
        email: bhEmail,
        name,
      })

      if (res.success && res.data?.accessToken) {
        api.setToken(res.data.accessToken)
        await refreshUser()
        router.push(redirect)
      } else {
        setError(res.error || 'Builder Hub login failed')
      }
    } catch {
      setError('Builder Hub login failed')
    } finally {
      setBhLoading(false)
    }
  }, [redirect, refreshUser, router])

  useEffect(() => {
    window.addEventListener('message', handleBHMessage)
    return () => window.removeEventListener('message', handleBHMessage)
  }, [handleBHMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await login(email, password)
    if (res.success) router.push(redirect)
    else setError(res.error || 'Login failed')
    setSubmitting(false)
  }

  const openBuilderHub = () => {
    // Open popup window (centered, like Google OAuth)
    const width = 500
    const height = 650
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    // In production: use the real Builder Hub OAuth URL
    // For now: use our mock callback page that simulates the flow
    const url = '/auth/builder-hub'

    window.open(
      url,
      'BuilderHub',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )
  }

  if (loading || user) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logos/Team1_Symbol_Main.svg" alt="team1" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Sign in to <span className="text-brand-500">team1</span></h1>
          <p className="text-sm text-zinc-500 mt-1">Welcome back to the community portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm text-zinc-300 mb-1.5">Email</label>
            <input className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-zinc-900/80 transition-all" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1.5">Password</label>
            <input className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 hover:bg-zinc-900/80 transition-all" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-zinc-600">OR</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <button
          onClick={openBuilderHub}
          disabled={bhLoading}
          className="w-full border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {bhLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              Continue with Builder Hub
            </>
          )}
        </button>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Don&apos;t have an account? <Link href="/signup" className="text-brand-500 hover:underline">Sign Up</Link>
        </p>

        <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-sm text-zinc-500 mb-3">Not a member yet?</p>
          <Link href="/apply" className="inline-block w-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 py-2.5 rounded-xl text-sm font-medium transition-all text-center">
            Apply for Membership
          </Link>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-8">&copy; {new Date().getFullYear()} team1. All rights reserved.</p>
      </div>
    </div>
  )
}
