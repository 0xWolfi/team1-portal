import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { regionSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'community_ops')) return apiError('Forbidden', 403)

    const regions = await prisma.region.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { memberships: { where: { status: 'accepted' } } } },
        memberships: {
          where: { role: { in: ['lead', 'co_lead'] } },
          include: { user: { select: { id: true, displayName: true, email: true } } },
        },
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
    const parsed = regionSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    // Auto-generate slug from name
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const existing = await prisma.region.findUnique({ where: { slug } })
    if (existing) return apiError('Region slug already exists', 409)

    const region = await prisma.region.create({ data: { ...parsed.data, slug } })
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'create', module: 'regions', entityType: 'Region', entityId: region.id },
    })
    return apiSuccess(region, 201)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
