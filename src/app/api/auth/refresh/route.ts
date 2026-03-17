import { prisma } from '@/lib/db'
import { generateAccessToken, generateRefreshToken, apiSuccess, apiError } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Get refresh token from cookie
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/refreshToken=([^;]+)/)
    const token = match?.[1]

    if (!token) return apiError('No refresh token', 401)

    const session = await prisma.authSession.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.authSession.delete({ where: { id: session.id } })
      return apiError('Session expired', 401)
    }

    if (!session.user.isActive) return apiError('Account deactivated', 403)

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken()
    await prisma.authSession.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    })

    const accessToken = generateAccessToken({ userId: session.userId, email: session.user.email })

    const response = apiSuccess({ accessToken })
    const res = new Response(response.body, response)
    res.headers.set(
      'Set-Cookie',
      `refreshToken=${newRefreshToken}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    )
    return res
  } catch (e) {
    console.error('Refresh error:', e)
    return apiError('Internal server error', 500)
  }
}
