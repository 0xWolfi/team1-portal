import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const activities = await prisma.memberActivity.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 20,
    })

    return apiSuccess({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,

      // Required fields
      country: user.country,
      discord: user.discord,
      xHandle: user.xHandle,

      // Location
      city: user.city,
      state: user.state,

      // Personal
      studentStatus: user.studentStatus,
      university: user.university,
      languages: user.languages,

      // Social platforms
      telegram: user.telegram,
      github: user.github,
      linkedin: user.linkedin,
      instagram: user.instagram,
      reddit: user.reddit,
      arena: user.arena,
      youtube: user.youtube,
      tiktok: user.tiktok,
      podcast: user.podcast,
      blog: user.blog,
      website: user.website,

      // Profile extras
      walletAddress: user.walletAddress,
      skills: user.skills,
      interests: user.interests,
      roles: user.roles,
      availability: user.availability,
      socialLinks: user.socialLinks,
      eventHostingPrefs: user.eventHostingPrefs,

      // Lead-only fields
      cChainAddress: user.cChainAddress,
      developmentGoals: user.developmentGoals,
      shippingAddress: user.shippingAddress,
      merchSizes: user.merchSizes,

      // Privacy
      privacySettings: user.privacySettings,

      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      adminRole: user.adminRole,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        regionId: m.regionId,
        role: m.role,
        status: m.status,
        isPrimary: m.isPrimary,
        region: m.region,
      })),
      activities: activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        type: a.type,
        title: a.title,
        description: a.description,
        date: a.date.toISOString(),
        link: a.link,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('Me error:', e)
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()

    // If username is being changed, check uniqueness
    if (body.username && body.username !== user.username) {
      const existing = await prisma.user.findUnique({
        where: { username: body.username },
      })
      if (existing && existing.id !== user.id) {
        return apiError('Username is already taken', 409)
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: body.displayName ?? undefined,
        username: body.username ?? undefined,
        bio: body.bio ?? undefined,

        // Required fields
        country: body.country ?? undefined,
        discord: body.discord ?? undefined,
        xHandle: body.xHandle ?? undefined,

        // Location
        city: body.city ?? undefined,
        state: body.state ?? undefined,

        // Personal
        studentStatus: body.studentStatus ?? undefined,
        university: body.university ?? undefined,
        languages: body.languages ?? undefined,

        // Social platforms
        telegram: body.telegram ?? undefined,
        github: body.github ?? undefined,
        linkedin: body.linkedin ?? undefined,
        instagram: body.instagram ?? undefined,
        reddit: body.reddit ?? undefined,
        arena: body.arena ?? undefined,
        youtube: body.youtube ?? undefined,
        tiktok: body.tiktok ?? undefined,
        podcast: body.podcast ?? undefined,
        blog: body.blog ?? undefined,
        website: body.website ?? undefined,

        // Profile extras
        walletAddress: body.walletAddress ?? undefined,
        skills: body.skills ?? undefined,
        interests: body.interests ?? undefined,
        roles: body.roles ?? undefined,
        availability: body.availability ?? undefined,
        socialLinks: body.socialLinks ?? undefined,
        eventHostingPrefs: body.eventHostingPrefs ?? undefined,

        // Lead-only fields
        cChainAddress: body.cChainAddress ?? undefined,
        developmentGoals: body.developmentGoals ?? undefined,
        shippingAddress: body.shippingAddress ?? undefined,
        merchSizes: body.merchSizes ?? undefined,

        // Privacy
        privacySettings: body.privacySettings ?? undefined,
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    console.error('Profile update error:', e)
    return apiError('Internal server error', 500)
  }
}
