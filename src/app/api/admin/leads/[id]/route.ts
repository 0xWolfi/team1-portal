import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { notifyMemberRoleChanged } from '@/lib/notify'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || admin.role !== 'super_admin') return apiError('Forbidden', 403)

    const { id } = await params

    const before = await prisma.userRegionMembership.findUnique({
      where: { id },
      select: { role: true, userId: true, regionId: true },
    })

    // Demote to member instead of deleting
    await prisma.userRegionMembership.update({
      where: { id },
      data: { role: 'member' },
    })

    if (before && before.role !== 'member') {
      await notifyMemberRoleChanged(before.userId, before.regionId, before.role, 'member', user.id)
    }

    return apiSuccess({ success: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
