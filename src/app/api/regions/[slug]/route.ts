import { prisma } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const region = await prisma.region.findUnique({
      where: { slug },
      include: {
        _count: { select: { memberships: { where: { status: 'accepted' } } } },
        memberships: {
          where: { status: 'accepted', role: { in: ['lead', 'co_lead'] } },
          include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
        },
      },
    })
    if (!region) return apiError('Region not found', 404)
    return apiSuccess(region)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
