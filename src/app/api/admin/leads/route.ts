import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const regions = await prisma.region.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        memberships: {
          where: { role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
          include: { user: { select: { id: true, displayName: true, email: true, username: true, avatarUrl: true } } },
        },
        _count: { select: { memberships: { where: { status: 'accepted' } } } },
      },
    })
    return apiSuccess(regions)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const body = await request.json()
    const { email, regionId, role = 'lead' } = body

    if (!email || !regionId) return apiError('Email and regionId required', 422)

    const targetUser = await prisma.user.findUnique({ where: { email } })
    if (!targetUser) return apiError('User not found with this email', 404)

    // Check existing membership
    const existing = await prisma.userRegionMembership.findUnique({
      where: { userId_regionId: { userId: targetUser.id, regionId } },
    })

    if (existing) {
      // Update role to lead
      await prisma.userRegionMembership.update({
        where: { id: existing.id },
        data: { role },
      })
    } else {
      await prisma.userRegionMembership.create({
        data: { userId: targetUser.id, regionId, role, status: 'accepted', isPrimary: false },
      })
    }

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'assign_lead', module: 'leads', entityType: 'Region', entityId: regionId, details: `Assigned ${email} as ${role}` },
    })

    return apiSuccess({ success: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
