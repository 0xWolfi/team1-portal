import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')
    const memberId = searchParams.get('memberId') // entity id for User module, or actor id
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 50

    const where: Record<string, unknown> = {}
    if (module) where.module = module
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (memberId) {
      where.OR = [
        { entityId: memberId, entityType: 'User' },
        { userId: memberId },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { displayName: true, email: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
