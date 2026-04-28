import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'community_ops')) return apiError('Forbidden', 403)

    const { id } = await params
    await prisma.announcement.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
