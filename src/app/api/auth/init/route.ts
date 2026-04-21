import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth-options'
import { prisma } from '@/lib/db'
import { generateAccessToken, createSession, accessTokenCookie, apiSuccess, apiError } from '@/lib/auth'

/**
 * POST /api/auth/init
 *
 * Called by the frontend after NextAuth sign-in completes.
 * Reads the NextAuth session, generates a portal access token, and sets
 * both the access token and refresh token as httpOnly cookies.
 *
 * This replaces the old flow where the access token was passed through
 * NextAuth's session object and stored in localStorage.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.userId) return apiError('No active session', 401)

    const user = await prisma.user.findUnique({
      where: { id: session.userId, isActive: true },
      select: { id: true, email: true },
    })
    if (!user) return apiError('User not found', 404)

    const accessToken = generateAccessToken({ userId: user.id, email: user.email })
    const refreshToken = await createSession(user.id)

    const response = apiSuccess({ initialized: true })
    const res = new Response(response.body, response)
    res.headers.append('Set-Cookie', accessTokenCookie(accessToken))
    res.headers.append(
      'Set-Cookie',
      `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    )
    return res
  } catch (e) {
    console.error('Auth init error:', e)
    return apiError('Internal server error', 500)
  }
}
