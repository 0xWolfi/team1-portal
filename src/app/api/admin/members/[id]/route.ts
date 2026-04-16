import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const { id } = await params
    const body = await request.json()
    const { role, status } = body

    const data: Record<string, unknown> = {}
    if (role) data.role = role
    if (status) data.status = status

    const before = await prisma.userRegionMembership.findUnique({
      where: { id },
      select: { role: true, status: true, userId: true, regionId: true },
    })
    if (!before) return apiError('Membership not found', 404)

    const membership = await prisma.userRegionMembership.update({
      where: { id },
      data,
      include: { user: { select: { displayName: true } }, region: { select: { name: true } } },
    })

    await recordAudit({
      userId: user.id,
      action: 'update',
      module: 'members',
      entityType: 'UserRegionMembership',
      entityId: id,
      details: `Membership update for ${membership.user.displayName} in ${membership.region.name}`,
      before: { role: before.role, status: before.status },
      after: { role: membership.role, status: membership.status },
      ipAddress: getRequestIp(request),
    })

    return apiSuccess(membership)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { id } = await params
    const before = await prisma.userRegionMembership.findUnique({
      where: { id },
      include: { user: { select: { displayName: true } }, region: { select: { name: true } } },
    })
    if (!before) return apiError('Membership not found', 404)

    await prisma.userRegionMembership.delete({ where: { id } })

    await recordAudit({
      userId: user.id,
      action: 'delete',
      module: 'members',
      entityType: 'UserRegionMembership',
      entityId: id,
      details: `Removed ${before.user.displayName} from ${before.region.name}`,
      before: { role: before.role, status: before.status, regionId: before.regionId, userId: before.userId },
      ipAddress: getRequestIp(request),
    })

    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
