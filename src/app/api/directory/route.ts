import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { filterProfileByPrivacy, type ViewerContext } from '@/lib/privacy'

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

    const where: Record<string, unknown> = { status: 'accepted' }
    if (regionId) where.regionId = regionId
    if (search) {
      where.user = {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const members = await prisma.userRegionMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            title: true,
            email: true,
            // Required (always public)
            country: true,
            discord: true,
            xHandle: true,
            // Location
            city: true,
            state: true,
            // Personal
            studentStatus: true,
            university: true,
            languages: true,
            cohort: true,
            // Social
            telegram: true,
            inRegionalTg: true,
            github: true,
            linkedin: true,
            instagram: true,
            reddit: true,
            arena: true,
            youtube: true,
            tiktok: true,
            twitch: true,
            farcaster: true,
            linktree: true,
            podcast: true,
            blog: true,
            website: true,
            buildersHub: true,
            // Profile extras
            walletAddress: true,
            skills: true,
            interests: true,
            roles: true,
            availability: true,
            socialLinks: true,
            eventHostingPrefs: true,
            // Lead-only
            cChainAddress: true,
            developmentGoals: true,
            shippingAddress: true,
            merchSizes: true,
            unisexTshirtSize: true,
            unisexHoodieSize: true,
            unisexPantsSize: true,
            womensTshirtSize: true,
            womensHoodieSize: true,
            womensPantsSize: true,
            // Status / admin
            status: true,
            adminNotes: true,
            // Privacy
            privacySettings: true,
          },
        },
        region: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by user so each user appears once with their full region list
    const grouped = new Map<string, { user: typeof members[number]['user']; regions: { id: string; name: string; slug: string }[] }>()
    for (const m of members) {
      const existing = grouped.get(m.userId)
      if (existing) {
        existing.regions.push(m.region)
      } else {
        grouped.set(m.userId, { user: m.user, regions: [m.region] })
      }
    }

    // Pre-compute viewer flags
    const isAdmin = !!viewer.adminRole && viewer.adminRole.role === 'super_admin'
    const leadRegionSlugs = (viewer.memberships || [])
      .filter((m) => m.role === 'lead' || m.role === 'co_lead')
      .map((m) => m.region.slug)

    const out = Array.from(grouped.values()).map(({ user, regions }) => {
      const targetRegionSlugs = regions.map((r) => r.slug)
      const ctx: ViewerContext = {
        viewerId: viewer.id,
        isMember: true,
        isAdmin,
        leadRegionSlugs,
        targetRegionSlugs,
      }
      const safeUser = filterProfileByPrivacy(user as unknown as Record<string, unknown> & { id: string; privacySettings: string | null }, ctx)
      return { ...safeUser, regions }
    })

    return apiSuccess(out)
  } catch (e) {
    console.error('Directory error:', e)
    return apiError('Internal server error', 500)
  }
}
