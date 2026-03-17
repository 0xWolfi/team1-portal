import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('region')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { status: 'published' }
    if (regionSlug) {
      const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
      if (region) where.regionId = region.id
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true, username: true } },
      },
    })
    return apiSuccess(playbooks)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
