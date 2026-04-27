import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { filterProfileByPrivacy, type ViewerContext } from '@/lib/privacy'

/**
 * GET /api/directory
 *
 * Returns one entry per user (deduplicated across region memberships), shaped
 * as `{ id, role, user: {...fields}, region: {name, slug} }` to stay
 * compatible with the existing /directory UI. Per-field privacy is enforced
 * on `user` relative to the viewer.
 */
export async function GET(request: Request) {
  try {
    const viewer = await getUserFromRequest(request)
    if (!viewer) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('region')
    const search = searchParams.get('search')

    let regionId: string | undefined
    if (regionSlug) {
      const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
      if (region) regionId = region.id
    }

    const userFilter: Record<string, unknown> = {
      isActive: true,
      status: { notIn: ['inactive', 'removed'] },
    }
    if (search) {
      userFilter.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
    }
    const where: Record<string, unknown> = { status: 'accepted', user: userFilter }
    if (regionId) where.regionId = regionId

    const memberships = await prisma.userRegionMembership.findMany({
      where,
      include: {
        user: true, // pull all user fields; we filter via privacy helper below
        region: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Gather each user's full region list for lead-overlap checks.
    const userIds = Array.from(new Set(memberships.map((m) => m.userId)))
    const allForUsers = userIds.length > 0
      ? await prisma.userRegionMembership.findMany({
          where: { userId: { in: userIds }, status: 'accepted' },
          select: { userId: true, region: { select: { slug: true } } },
        })
      : []
    const regionsByUser = new Map<string, string[]>()
    for (const row of allForUsers) {
      const list = regionsByUser.get(row.userId) ?? []
      list.push(row.region.slug)
      regionsByUser.set(row.userId, list)
    }

    const isAdmin = !!viewer.adminRole && viewer.adminRole.role === 'super_admin'
    const leadRegionSlugs = (viewer.memberships || [])
      .filter((m) => m.role === 'lead' || m.role === 'co_lead')
      .map((m) => m.region.slug)

    // Deduplicate by userId (old behaviour) and attach privacy-filtered user.
    const seen = new Set<string>()
    const result: Array<{
      id: string
      role: string
      user: Record<string, unknown>
      region: { id: string; name: string; slug: string }
    }> = []

    for (const m of memberships) {
      if (seen.has(m.userId)) continue
      seen.add(m.userId)

      const ctx: ViewerContext = {
        viewerId: viewer.id,
        isMember: true,
        isAdmin,
        leadRegionSlugs,
        targetRegionSlugs: regionsByUser.get(m.userId) ?? [],
      }

      // Strip sensitive columns we never want to ship to the client at all.
      const { passwordHash: _pw, ...userRow } = m.user as unknown as Record<string, unknown> & { passwordHash?: string; id: string; privacySettings: string | null }
      const safeUser = filterProfileByPrivacy(userRow, ctx)

      result.push({
        id: m.id,
        role: m.role,
        user: safeUser,
        region: m.region,
      })
    }

    return apiSuccess(result)
  } catch (e) {
    console.error('Directory error:', e)
    return apiError('Internal server error', 500)
  }
}
