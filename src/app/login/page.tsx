'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useAuth } from '@/context/auth-context'
import { SupportWidget } from '@/components/layout/support-widget'

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}

function LoginContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showApplyNotice, setShowApplyNotice] = useState(false)

  useEffect(() => {
    if (!loading && user) router.push(redirect)
  }, [user, loading, router, redirect])

  // Show errors from OAuth redirects
  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam === 'not_in_roster') {
      setError('Your email is not in the member roster. Please contact an admin.')
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signIn('google', { callbackUrl: redirect })
    } catch {
      setError('Google sign-in failed')
      setGoogleLoading(false)
    }
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

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full bg-white hover:bg-zinc-100 text-zinc-900 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3"
        >
          {googleLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-sm text-zinc-500 mb-3">Not a member yet?</p>
          <button
            type="button"
            onClick={() => setShowApplyNotice(true)}
            className="w-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 py-2.5 rounded-xl text-sm font-medium transition-all text-center cursor-pointer"
          >
            Apply for Membership
          </button>
          {showApplyNotice && (
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Membership applications are coming soon. Please check back later.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-8">&copy; {new Date().getFullYear()} team1. All rights reserved.</p>
      </div>
      <SupportWidget />
    </div>
  )
}
