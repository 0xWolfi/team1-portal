import { prisma } from '@/lib/db'
import { generateAccessToken, createSession, apiSuccess, apiError } from '@/lib/auth'

/**
 * Builder Hub OAuth Login
 *
 * Flow:
 * 1. User clicks "Continue with Builder Hub" on login page
 * 2. Popup opens with Builder Hub login
 * 3. User authenticates on Builder Hub
 * 4. Builder Hub sends back token + user info via postMessage
 * 5. Frontend calls this endpoint with the token, email, and name
 * 6. We validate the token (in production, call Builder Hub API to verify)
 * 7. Look up user by email — they must be an existing member
 * 8. Create session and return access token
 *
 * PRODUCTION TODO:
 * - Validate the token against: BUILDER_HUB_VALIDATE_URL
 * - Extract email/name from the validated JWT instead of trusting client data
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, email, name } = body

    if (!token || !email) {
      return apiError('Token and email are required', 422)
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Production: Validate token with Builder Hub API ──────────
    // Uncomment when you have real Builder Hub credentials:
    //
    // const validateRes = await fetch(process.env.BUILDER_HUB_VALIDATE_URL!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ token }),
    // })
    // if (!validateRes.ok) return apiError('Invalid Builder Hub token', 401)
    // const bhData = await validateRes.json()
    // const normalizedEmail = bhData.email.toLowerCase().trim()
    // const name = bhData.name
    // ─────────────────────────────────────────────────────────────

    // Look up user by email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        adminRole: true,
        memberships: {
          where: { status: 'accepted' },
          include: { region: true },
        },
      },
    })

    // If user doesn't exist, create them (they can still log in but won't be a member)
    if (!user) {
      const username = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase()
      let finalUsername = username
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) finalUsername = `${username}_${Date.now().toString(36)}`

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          displayName: name || normalizedEmail.split('@')[0],
          username: finalUsername,
          emailVerified: true,
        },
        include: {
          adminRole: true,
          memberships: {
            where: { status: 'accepted' },
            include: { region: true },
          },
        },
      })
    }

    if (!user.isActive) return apiError('Account is deactivated', 403)

    // Create session
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = await createSession(user.id, ip, ua)

    const response = apiSuccess({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        adminRole: user.adminRole,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          regionId: m.regionId,
          role: m.role,
          status: m.status,
          isPrimary: m.isPrimary,
          region: m.region,
        })),
      },
    })

    // Set refresh token cookie
    const res = new Response(response.body, response)
    res.headers.set(
      'Set-Cookie',
      `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    )
    return res
  } catch (e) {
    console.error('Builder Hub login error:', e)
    return apiError('Internal server error', 500)
  }
}
