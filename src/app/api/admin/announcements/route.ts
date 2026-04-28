import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'community_ops')) return apiError('Forbidden', 403)

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true } },
      },
    })
    return apiSuccess(announcements)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
