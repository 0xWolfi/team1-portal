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
    const { role, status } = body

    const data: Record<string, unknown> = {}
    if (role) data.role = role
    if (status) data.status = status

    const membership = await prisma.userRegionMembership.update({
      where: { id },
      data,
      include: { user: { select: { displayName: true } }, region: { select: { name: true } } },
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
    await prisma.userRegionMembership.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
