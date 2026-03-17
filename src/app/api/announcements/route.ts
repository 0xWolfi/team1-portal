import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { announcementSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('region')

    const where: Record<string, unknown> = {}
    if (regionSlug === 'global') {
      where.isGlobal = true
    } else if (regionSlug) {
      const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
      if (region) {
        where.OR = [{ regionId: region.id }, { isGlobal: true }]
      }
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true, username: true } },
      },
    })
    return apiSuccess(announcements)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const body = await request.json()
    const parsed = announcementSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { expiresAt, ...rest } = parsed.data
    const announcement = await prisma.announcement.create({
      data: {
        ...rest,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: user.id,
      },
      include: { region: { select: { name: true, slug: true } }, creator: { select: { displayName: true, username: true } } },
    })
    return apiSuccess(announcement, 201)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
