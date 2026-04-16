import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { filterProfileByPrivacy, type ViewerContext } from '@/lib/privacy'

/**
 * GET /api/users/[id]
 * Returns a single user's public profile, with per-field privacy enforcement
 * relative to the requesting viewer.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await getUserFromRequest(request)
    if (!viewer) return apiError('Unauthorized', 401)

    const { id } = await params

    const target = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'accepted' },
          include: { region: { select: { id: true, name: true, slug: true } } },
        },
      },
    })
    if (!target) return apiError('User not found', 404)

    const isAdmin = !!viewer.adminRole && viewer.adminRole.role === 'super_admin'
    const leadRegionSlugs = (viewer.memberships || [])
      .filter((m) => m.role === 'lead' || m.role === 'co_lead')
      .map((m) => m.region.slug)
    const targetRegionSlugs = target.memberships.map((m) => m.region.slug)

    const ctx: ViewerContext = {
      viewerId: viewer.id,
      isMember: true,
      isAdmin,
      leadRegionSlugs,
      targetRegionSlugs,
    }

    const { memberships, passwordHash: _pw, ...rest } = target as unknown as Record<string, unknown> & { memberships: unknown; passwordHash?: string }
    const safe = filterProfileByPrivacy(rest as Record<string, unknown> & { id: string; privacySettings: string | null }, ctx)

    return apiSuccess({
      ...safe,
      memberships,
    })
  } catch (e) {
    console.error('User fetch error:', e)
    return apiError('Internal server error', 500)
  }
}
