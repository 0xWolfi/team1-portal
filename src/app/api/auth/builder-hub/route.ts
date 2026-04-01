import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * GET /api/auth/builder-hub
 *
 * Redirects user to Builder Hub OAuth authorize page.
 * Builder Hub will authenticate the user and redirect back to our callback.
 */
export async function GET() {
  const clientId = process.env.BUILDER_HUB_CLIENT_ID
  const bhUrl = process.env.BUILDER_HUB_URL
  const redirectUri = process.env.BUILDER_HUB_REDIRECT_URI

  if (!clientId || !bhUrl || !redirectUri) {
    return NextResponse.redirect(new URL('/login?error=builder_hub_not_configured', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })

  const authorizeUrl = `${bhUrl}/oauth/authorize?${params.toString()}`

  // Store state in cookie for verification on callback
  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('bh_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
