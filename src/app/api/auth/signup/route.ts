import { prisma } from '@/lib/db'
import { hashPassword, generateAccessToken, createSession, apiSuccess, apiError } from '@/lib/auth'
import { signupSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { email, password, displayName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return apiError('Email already registered', 409)

    const passwordHash = await hashPassword(password)
    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase()

    // Check username uniqueness
    let finalUsername = username
    const existingUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUsername) finalUsername = `${username}_${Date.now().toString(36)}`

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, username: finalUsername, emailVerified: true },
      include: { adminRole: true, memberships: { include: { region: true } } },
    })

    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
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
        memberships: [],
      },
    }, 201)

    const res = new Response(response.body, response)
    res.headers.set(
      'Set-Cookie',
      `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    )
    return res
  } catch (e) {
    console.error('Signup error:', e)
    return apiError('Internal server error', 500)
  }
}
