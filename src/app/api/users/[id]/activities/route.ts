import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

/**
 * GET /api/users/[id]/activities
 *
 * Returns activities for the target user, filtered by visibility relative to
 * the requesting viewer:
 *   - viewer is the target          -> all activities
 *   - viewer is super_admin         -> all activities
 *   - viewer is lead/co_lead in any region the target is a member of -> visibility >= 1
 *   - viewer is a regular member    -> visibility >= 2
 *   - anything else (anon)          -> visibility >= 3
 *
 * The filter is applied SERVER-SIDE — never trust the client to enforce.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await getUserFromRequest(request)
    if (!viewer) return apiError('Unauthorized', 401)

    const { id: targetId } = await params

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        memberships: {
          where: { status: 'accepted' },
          select: { region: { select: { slug: true } } },
        },
      },
    })
    if (!target) return apiError('User not found', 404)

    const isSelf = viewer.id === target.id
    const isAdmin = !!viewer.adminRole && viewer.adminRole.role === 'super_admin'

    const viewerLeadSlugs = (viewer.memberships || [])
      .filter((m) => m.role === 'lead' || m.role === 'co_lead')
      .map((m) => m.region.slug)
    const targetSlugs = target.memberships.map((m) => m.region.slug)
    const viewerIsLeadForTarget =
      viewerLeadSlugs.length > 0 && targetSlugs.some((s) => viewerLeadSlugs.includes(s))

    let minVisibility: number
    if (isSelf || isAdmin) minVisibility = 0
    else if (viewerIsLeadForTarget) minVisibility = 1
    else minVisibility = 2 // signed-in member

    const activities = await prisma.memberActivity.findMany({
      where: {
        userId: target.id,
        visibility: { gte: minVisibility },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return apiSuccess(
      activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        type: a.type,
        typeOther: a.typeOther,
        title: a.title,
        description: a.description,
        date: a.date.toISOString(),
        link: a.link,
        source: a.source,
        visibility: a.visibility,
        includeInReport: a.includeInReport,
        createdAt: a.createdAt.toISOString(),
      })),
    )
  } catch (e) {
    console.error('User activities error:', e)
    return apiError('Internal server error', 500)
  }
}
