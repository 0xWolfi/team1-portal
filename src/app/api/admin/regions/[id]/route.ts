import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { id } = await params
    const body = await request.json()

    const region = await prisma.region.update({
      where: { id },
      data: {
        name: body.name,
        country: body.country,
        description: body.description,
        logoUrl: body.logoUrl,
        coverImageUrl: body.coverImageUrl,
        isActive: body.isActive,
      },
    })
    return apiSuccess(region)
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
    await prisma.region.delete({ where: { id } })
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'delete', module: 'regions', entityType: 'Region', entityId: id },
    })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
