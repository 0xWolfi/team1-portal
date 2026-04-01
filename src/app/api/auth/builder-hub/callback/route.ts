import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { generateAccessToken, createSession } from '@/lib/auth'

/**
 * GET /api/auth/builder-hub/callback
 *
 * Builder Hub redirects here after user authenticates.
 * Flow:
 *  1. Receive auth code + state from Builder Hub
 *  2. Verify state matches cookie (CSRF protection)
 *  3. Exchange code for access token with Builder Hub
 *  4. Fetch user profile (email, name) from Builder Hub
 *  5. Check if email exists in our DB → if yes, create session; if no, deny
 */
export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Builder Hub returned an error
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=builder_hub_denied`, baseUrl))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL(`/login?error=builder_hub_invalid`, baseUrl))
    }

    // Verify state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('bh_oauth_state')?.value
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(new URL(`/login?error=builder_hub_state_mismatch`, baseUrl))
    }

    const clientId = process.env.BUILDER_HUB_CLIENT_ID!
    const clientSecret = process.env.BUILDER_HUB_CLIENT_SECRET!
    const bhUrl = process.env.BUILDER_HUB_URL!
    const redirectUri = process.env.BUILDER_HUB_REDIRECT_URI!

    // ─── Step 1: Exchange code for token ─────────────────────────
    const tokenRes = await fetch(`${bhUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenRes.ok) {
      console.error('Builder Hub token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(new URL(`/login?error=builder_hub_token_failed`, baseUrl))
    }

    const tokenData = await tokenRes.json()
    const bhAccessToken = tokenData.access_token

    if (!bhAccessToken) {
      return NextResponse.redirect(new URL(`/login?error=builder_hub_no_token`, baseUrl))
    }

    // ─── Step 2: Fetch user profile from Builder Hub ─────────────
    const profileRes = await fetch(`${bhUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${bhAccessToken}` },
    })

    if (!profileRes.ok) {
      console.error('Builder Hub profile fetch failed:', await profileRes.text())
      return NextResponse.redirect(new URL(`/login?error=builder_hub_profile_failed`, baseUrl))
    }

    const profile = await profileRes.json()
    const email = (profile.email || '').toLowerCase().trim()
    const name = profile.name || profile.display_name || email.split('@')[0]

    if (!email) {
      return NextResponse.redirect(new URL(`/login?error=builder_hub_no_email`, baseUrl))
    }

    // ─── Step 3: Check if user exists in our DB ──────────────────
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        adminRole: true,
        memberships: { where: { status: 'accepted' }, include: { region: true } },
      },
    })

    // If not in DB, check roster
    if (!user) {
      const rosterEntry = await prisma.memberRoster.findUnique({ where: { email } })
      if (!rosterEntry) {
        return NextResponse.redirect(new URL(`/login?error=not_in_roster`, baseUrl))
      }

      // Create user from roster
      user = await prisma.user.create({
        data: {
          email,
          displayName: rosterEntry.name || name,
          emailVerified: true,
        },
        include: {
          adminRole: true,
          memberships: { where: { status: 'accepted' }, include: { region: true } },
        },
      })

      await prisma.memberRoster.update({
        where: { id: rosterEntry.id },
        data: { isUsed: true },
      })
    }

    if (!user.isActive) {
      return NextResponse.redirect(new URL(`/login?error=account_deactivated`, baseUrl))
    }

    // ─── Step 4: Create our session ──────────────────────────────
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = await createSession(user.id, ip, ua)

    // Redirect to dashboard with token set via cookie
    // The frontend will pick this up and store it
    const response = NextResponse.redirect(new URL(`/auth/builder-hub?token=${accessToken}`, baseUrl))

    // Set refresh token cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    // Clear state cookie
    response.cookies.delete('bh_oauth_state')

    return response
  } catch (e) {
    console.error('Builder Hub callback error:', e)
    return NextResponse.redirect(new URL(`/login?error=builder_hub_error`, baseUrl))
  }
}
