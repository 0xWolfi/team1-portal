import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

/**
 * GET /api/admin/role-requests
 * List role requests for admin review. Optional ?status=pending|approved|rejected.
 */
export async function GET(request: Request) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)
    const isAdmin = await prisma.platformAdmin.findUnique({ where: { userId: actor.id } })
    if (!isAdmin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const items = await prisma.memberRoleRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
    })

    return apiSuccess(items)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
