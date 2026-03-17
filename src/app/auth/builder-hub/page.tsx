'use client'
import { useState } from 'react'

/**
 * Builder Hub OAuth Popup Page
 *
 * In PRODUCTION: This page would redirect to the real Builder Hub OAuth URL.
 * The Builder Hub would authenticate the user and redirect back with a JWT token.
 * We'd then validate that token against the Builder Hub API.
 *
 * For DEVELOPMENT: This simulates the flow with a mock login form.
 * When you have the real Builder Hub credentials, replace this with:
 *   redirect(`${BUILDER_HUB_URL}/oauth/authorize?client_id=...&redirect_uri=...`)
 */

export default function BuilderHubPopup() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleLogin = async () => {
    if (!email || !name) {
      setError('Please fill in all fields')
      return
    }

    setSending(true)
    setError('')

    // Simulate Builder Hub auth — in production this would be a real JWT from Builder Hub
    const mockToken = `bh_mock_${btoa(email)}_${Date.now()}`

    // Send data back to the parent window (login page)
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'BUILDER_HUB_AUTH',
          token: mockToken,
          email: email.toLowerCase().trim(),
          name: name.trim(),
        },
        window.location.origin
      )

      // Close popup after a brief delay
      setTimeout(() => window.close(), 500)
    } else {
      setError('Popup was not opened correctly. Please try again.')
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Builder Hub Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Builder Hub</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to continue to team1 portal</p>
        </div>

        {/* Mock development notice */}
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400 text-center">
            Development Mode — This simulates Builder Hub OAuth.
            <br />In production, this will be the real Builder Hub login.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="block text-sm text-zinc-300 mb-1.5">Full Name</label>
            <input
              className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
              placeholder="Your name on Builder Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1.5">Email</label>
            <input
              className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={sending}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sending ? 'Authenticating...' : 'Sign In with Builder Hub'}
          </button>

          <button
            onClick={() => window.close()}
            className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-8">
          Powered by Avalanche Builder Hub
        </p>
      </div>
    </div>
  )
}
