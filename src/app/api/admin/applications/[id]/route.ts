import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

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
    const { status, reviewNote, regionId } = body

    if (!['approved', 'rejected'].includes(status)) return apiError('Invalid status', 422)

    const app = await prisma.membershipApplication.update({
      where: { id },
      data: { status, reviewedBy: user.id, reviewNote, reviewedAt: new Date() },
    })

    if (status === 'approved' && regionId) {
      let memberUser = await prisma.user.findUnique({ where: { email: app.email } })
      if (!memberUser) {
        const username = app.email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase()
        memberUser = await prisma.user.create({
          data: { email: app.email, displayName: app.fullName, username: `${username}_${Date.now().toString(36)}`, emailVerified: true },
        })
      }
      const existingMembership = await prisma.userRegionMembership.findUnique({
        where: { userId_regionId: { userId: memberUser.id, regionId } },
      })
      if (!existingMembership) {
        await prisma.userRegionMembership.create({
          data: { userId: memberUser.id, regionId, role: 'member', status: 'accepted', isPrimary: true },
        })
      }
    }

    await prisma.auditLog.create({
      data: { userId: user.id, action: `application_${status}`, module: 'applications', entityType: 'MembershipApplication', entityId: id },
    })

    return apiSuccess(app)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
