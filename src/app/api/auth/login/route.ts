import { prisma } from '@/lib/db'
import { verifyPassword, generateAccessToken, createSession, apiSuccess, apiError } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({
      where: { email },
      include: { adminRole: true, memberships: { where: { status: 'accepted' }, include: { region: true } } },
    })

    if (!user || !user.passwordHash) return apiError('Invalid email or password', 401)
    if (!user.isActive) return apiError('Account is deactivated', 403)

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return apiError('Invalid email or password', 401)

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
    console.error('Login error:', e)
    return apiError('Internal server error', 500)
  }
}
