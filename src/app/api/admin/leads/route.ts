import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { sendMemberAddedMail } from '@/lib/mailer'
import { leadAssignmentSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'community_ops')) return apiError('Forbidden', 403)

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
    if (!admin || admin.role !== 'super_admin') return apiError('Forbidden', 403)

    const body = await request.json()
    const parsed = leadAssignmentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { email, regionId, role } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    let targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          displayName: normalizedEmail.split('@')[0],
          emailVerified: false,
        },
      })
    }

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

    // Non-blocking: send email to the user about their new role
    const region = await prisma.region.findUnique({ where: { id: regionId }, select: { name: true } })
    sendMemberAddedMail({
      toEmail: email,
      toName: targetUser.displayName,
      regionName: region?.name || 'Unknown',
      role,
    }).catch(() => {})

    return apiSuccess({ success: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
