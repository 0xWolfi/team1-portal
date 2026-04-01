import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

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
            // Social
            telegram: true,
            github: true,
            linkedin: true,
            instagram: true,
            reddit: true,
            arena: true,
            youtube: true,
            tiktok: true,
            podcast: true,
            blog: true,
            website: true,
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
            // Privacy
            privacySettings: true,
          },
        },
        region: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate by userId
    const seen = new Set()
    const unique = members.filter((m) => {
      if (seen.has(m.userId)) return false
      seen.add(m.userId)
      return true
    })

    return apiSuccess(unique)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
