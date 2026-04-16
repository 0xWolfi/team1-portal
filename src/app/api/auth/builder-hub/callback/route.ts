import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { generateAccessToken, createSession } from '@/lib/auth'

/**
 * GET /api/auth/builder-hub/callback
 *
 * Builder Hub redirects here after user authenticates.
 */
export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/login?error=builder_hub_denied', baseUrl))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=builder_hub_invalid', baseUrl))
    }

    // Verify state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('bh_oauth_state')?.value
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(new URL('/login?error=builder_hub_state_mismatch', baseUrl))
    }

    const clientId = process.env.BUILDER_HUB_CLIENT_ID!
    const clientSecret = process.env.BUILDER_HUB_CLIENT_SECRET!
    const bhUrl = process.env.BUILDER_HUB_URL!
    const redirectUri = process.env.BUILDER_HUB_REDIRECT_URI!

    // Step 1: Exchange code for token
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
      return NextResponse.redirect(new URL('/login?error=builder_hub_token_failed', baseUrl))
    }

    const tokenData = await tokenRes.json()
    const bhAccessToken = tokenData.access_token

    if (!bhAccessToken) {
      return NextResponse.redirect(new URL('/login?error=builder_hub_no_token', baseUrl))
    }

    // Step 2: Fetch user profile from Builder Hub
    const profileRes = await fetch(`${bhUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${bhAccessToken}` },
    })

    if (!profileRes.ok) {
      console.error('Builder Hub profile fetch failed:', await profileRes.text())
      return NextResponse.redirect(new URL('/login?error=builder_hub_profile_failed', baseUrl))
    }

    const profile = await profileRes.json()
    const email = (profile.email || '').toLowerCase().trim()
    const name = profile.name || profile.display_name || email.split('@')[0]

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=builder_hub_no_email', baseUrl))
    }

    // Step 3: Check if user exists in our DB
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        adminRole: true,
        memberships: { where: { status: 'accepted' }, include: { region: true } },
      },
    })

    // If not in DB, check whitelist / roster
    if (!user) {
      if (email.endsWith('@team1.network')) {
        // Auto-whitelist all @team1.network emails — land them in Global as members
        const created = await prisma.user.create({
          data: { email, displayName: name, emailVerified: true },
        })
        const globalRegion = await prisma.region.findUnique({ where: { slug: 'global' } })
        if (globalRegion) {
          await prisma.userRegionMembership.create({
            data: {
              userId: created.id,
              regionId: globalRegion.id,
              role: 'member',
              status: 'accepted',
              isPrimary: true,
            },
          })
        }
        user = await prisma.user.findUnique({
          where: { id: created.id },
          include: {
            adminRole: true,
            memberships: { where: { status: 'accepted' }, include: { region: true } },
          },
        })
      } else {
        // Check roster
        const rosterEntry = await prisma.memberRoster.findUnique({ where: { email } })
        if (!rosterEntry) {
          return NextResponse.redirect(new URL('/login?error=not_in_roster', baseUrl))
        }

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
    }

    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL('/login?error=account_deactivated', baseUrl))
    }

    // Step 4: Create our session
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = await createSession(user.id, ip, ua)

    const response = NextResponse.redirect(new URL(`/auth/builder-hub?token=${accessToken}`, baseUrl))

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    response.cookies.delete('bh_oauth_state')

    return response
  } catch (e) {
    console.error('Builder Hub callback error:', e)
    return NextResponse.redirect(new URL('/login?error=builder_hub_error', baseUrl))
  }
}
