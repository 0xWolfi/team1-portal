import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

/**
 * GET /api/admin/activities
 *
 * Admins see all activities.
 * Region leads (lead/co_lead) see activities from members in their region(s).
 * Filters: ?regionSlug=...&source=...&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1
 *
 * Visibility classes (MemberActivity.visibility):
 *   0 = private/admin only          (admins only)
 *   1 = leads + admins              (default; admins + region leads)
 *   2 = members                     (any signed-in member)
 *   3 = public                      (anyone)
 */
export async function GET(request: Request) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)

    const isAdmin = !!(await prisma.platformAdmin.findUnique({ where: { userId: actor.id } }))
    const leadMemberships = await prisma.userRegionMembership.findMany({
      where: { userId: actor.id, role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
      select: { regionId: true, region: { select: { slug: true } } },
    })
    const isLead = leadMemberships.length > 0

    if (!isAdmin && !isLead) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('regionSlug')
    const source = searchParams.get('source')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 50

    // Determine which region IDs the actor is allowed to see.
    let regionIdsAllowed: string[] | null = null
    if (!isAdmin) {
      regionIdsAllowed = leadMemberships.map((m) => m.regionId)
    }

    // If a regionSlug filter is supplied, restrict to that region (and verify access).
    if (regionSlug) {
      const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
      if (!region) return apiError('Region not found', 404)
      if (!isAdmin && !regionIdsAllowed!.includes(region.id)) return apiError('Forbidden', 403)
      regionIdsAllowed = [region.id]
    }

    // Find users that are members of the allowed regions (if scoped).
    let userIdsScope: string[] | null = null
    if (regionIdsAllowed) {
      const memberRows = await prisma.userRegionMembership.findMany({
        where: { regionId: { in: regionIdsAllowed }, status: 'accepted' },
        select: { userId: true },
      })
      userIdsScope = Array.from(new Set(memberRows.map((m) => m.userId)))
    }

    const where: Record<string, unknown> = {}
    if (userIdsScope) where.userId = { in: userIdsScope }
    if (source) where.source = source
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }
    // Visibility gating: leads only see visibility >= 1; admins see everything.
    if (!isAdmin) where.visibility = { gte: 1 }

    const [items, total] = await Promise.all([
      prisma.memberActivity.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.memberActivity.count({ where }),
    ])

    return apiSuccess({
      items: items.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    console.error('Admin activities error:', e)
    return apiError('Internal server error', 500)
  }
}
