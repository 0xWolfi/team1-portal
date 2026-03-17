import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    return apiSuccess({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      city: user.city,
      country: user.country,
      walletAddress: user.walletAddress,
      discord: user.discord,
      xHandle: user.xHandle,
      telegram: user.telegram,
      github: user.github,
      skills: user.skills,
      interests: user.interests,
      roles: user.roles,
      availability: user.availability,
      socialLinks: user.socialLinks,
      showEmail: user.showEmail,
      showWallet: user.showWallet,
      showDiscord: user.showDiscord,
      showTelegram: user.showTelegram,
      showXHandle: user.showXHandle,
      showGithub: user.showGithub,
      showCity: user.showCity,
      showBio: user.showBio,
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
        city: body.city ?? undefined,
        country: body.country ?? undefined,
        walletAddress: body.walletAddress ?? undefined,
        discord: body.discord ?? undefined,
        xHandle: body.xHandle ?? undefined,
        telegram: body.telegram ?? undefined,
        github: body.github ?? undefined,
        skills: body.skills ?? undefined,
        interests: body.interests ?? undefined,
        roles: body.roles ?? undefined,
        availability: body.availability ?? undefined,
        socialLinks: body.socialLinks ?? undefined,
        showEmail: body.showEmail ?? undefined,
        showWallet: body.showWallet ?? undefined,
        showDiscord: body.showDiscord ?? undefined,
        showTelegram: body.showTelegram ?? undefined,
        showXHandle: body.showXHandle ?? undefined,
        showGithub: body.showGithub ?? undefined,
        showCity: body.showCity ?? undefined,
        showBio: body.showBio ?? undefined,
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    console.error('Profile update error:', e)
    return apiError('Internal server error', 500)
  }
}
