import { prisma } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/auth'

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { memberships: { where: { status: 'accepted' } } } } },
    })
    return apiSuccess(regions)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
