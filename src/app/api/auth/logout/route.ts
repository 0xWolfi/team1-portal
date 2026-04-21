import { prisma } from '@/lib/db'
import { apiSuccess, apiError, clearAccessTokenCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/refreshToken=([^;]+)/)
    const token = match?.[1]

    if (token) {
      await prisma.authSession.deleteMany({ where: { refreshToken: token } })
    }

    const response = apiSuccess({ message: 'Logged out' })
    const res = new Response(response.body, response)
    // Clear both cookies
    res.headers.append('Set-Cookie', clearAccessTokenCookie())
    res.headers.append(
      'Set-Cookie',
      `refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    )
    return res
  } catch (e) {
    console.error('Logout error:', e)
    return apiError('Internal server error', 500)
  }
}
