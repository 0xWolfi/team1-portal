import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { notificationUpdateSchema } from '@/lib/validations'

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
    const parsed = notificationUpdateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    if (parsed.data.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    } else if (parsed.data.id) {
      await prisma.notification.update({
        where: { id: parsed.data.id, userId: user.id },
        data: { isRead: true },
      })
    }
    return apiSuccess({ success: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
