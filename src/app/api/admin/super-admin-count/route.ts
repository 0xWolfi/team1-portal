import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || admin.role !== 'super_admin') return apiError('Forbidden', 403)

    const count = await prisma.platformAdmin.count({ where: { role: 'super_admin' } })
    return apiSuccess({ count })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
