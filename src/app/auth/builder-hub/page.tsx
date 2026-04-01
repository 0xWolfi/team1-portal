'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

export default function BuilderHubCallbackPage() {
  return <Suspense><CallbackContent /></Suspense>
}

/**
 * Builder Hub OAuth popup page.
 *
 * Two modes:
 * 1. No ?token param → redirect to Builder Hub authorize URL
 * 2. Has ?token param → send token back to parent window via postMessage and close
 */
function CallbackContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      // Got token from callback — send to parent window and close popup
      if (window.opener) {
        window.opener.postMessage({ type: 'BUILDER_HUB_AUTH', accessToken: token }, window.location.origin)
        setTimeout(() => window.close(), 500)
      }
    } else {
      // No token — redirect to Builder Hub authorize page
      window.location.href = '/api/auth/builder-hub'
    }
  }, [token])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">
          {token ? 'Completing sign in...' : 'Redirecting to Builder Hub...'}
        </p>
      </div>
    </div>
  )
}
