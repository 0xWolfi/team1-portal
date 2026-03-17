import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return apiSuccess(notifications)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    } else if (body.id) {
      await prisma.notification.update({
        where: { id: body.id, userId: user.id },
        data: { isRead: true },
      })
    }
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
