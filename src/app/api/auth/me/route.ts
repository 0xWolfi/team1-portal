import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { selfEditableProfileSchema } from '@/lib/validations'

// Fields the user themselves can edit on their own profile.
const SELF_EDITABLE_FIELDS = [
  'displayName', 'username', 'avatarUrl', 'bio', 'title',
  'country', 'discord', 'xHandle',
  'city', 'state',
  'studentStatus', 'university', 'languages', 'cohort',
  'telegram', 'github', 'linkedin', 'instagram', 'reddit',
  'arena', 'youtube', 'tiktok', 'twitch', 'farcaster', 'linktree',
  'podcast', 'blog', 'website',
  'walletAddress', 'skills', 'interests', 'roles', 'availability',
  'socialLinks', 'eventHostingPrefs',
  'cChainAddress', 'developmentGoals', 'shippingAddress', 'merchSizes',
  'unisexTshirtSize', 'unisexHoodieSize', 'unisexPantsSize',
  'womensTshirtSize', 'womensHoodieSize', 'womensPantsSize',
  'privacySettings',
] as const

type SelfEditable = typeof SELF_EDITABLE_FIELDS[number]

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
      title: user.title,

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
      cohort: user.cohort,

      // Social platforms
      telegram: user.telegram,
      inRegionalTg: user.inRegionalTg,
      github: user.github,
      linkedin: user.linkedin,
      instagram: user.instagram,
      reddit: user.reddit,
      arena: user.arena,
      youtube: user.youtube,
      tiktok: user.tiktok,
      twitch: user.twitch,
      farcaster: user.farcaster,
      linktree: user.linktree,
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
      unisexTshirtSize: user.unisexTshirtSize,
      unisexHoodieSize: user.unisexHoodieSize,
      unisexPantsSize: user.unisexPantsSize,
      womensTshirtSize: user.womensTshirtSize,
      womensHoodieSize: user.womensHoodieSize,
      womensPantsSize: user.womensPantsSize,

      // Status / admin
      status: user.status,
      adminNotes: user.adminRole ? user.adminNotes : undefined,

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
    const parsed = selfEditableProfileSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const validatedBody = parsed.data

    // If username is being changed, check uniqueness
    if (validatedBody.username && validatedBody.username !== user.username) {
      const existing = await prisma.user.findUnique({
        where: { username: validatedBody.username },
      })
      if (existing && existing.id !== user.id) {
        return apiError('Username is already taken', 409)
      }
    }

    // Only persist fields the user is allowed to edit on their own profile.
    // (Status, adminNotes, inRegionalTg are admin-only — never written here.)
    const data: Record<string, unknown> = {}
    const before: Record<string, unknown> = {}
    for (const key of SELF_EDITABLE_FIELDS) {
      if ((validatedBody as Record<string, unknown>)[key] !== undefined) {
        const val = (validatedBody as Record<string, unknown>)[key]
        data[key] = val === '' ? null : val
        before[key] = (user as unknown as Record<string, unknown>)[key as SelfEditable]
      }
    }
    // cohort comes in as a number — coerce safely
    if (data.cohort !== undefined && data.cohort !== null) {
      const n = typeof data.cohort === 'string' ? parseInt(data.cohort, 10) : Number(data.cohort)
      data.cohort = Number.isFinite(n) ? n : null
    }

    let updated
    try {
      updated = await prisma.user.update({
        where: { id: user.id },
        data,
      })
    } catch (e: any) {
      // Catch unique constraint violation on username (race condition safe)
      if (e?.code === 'P2002' && e?.meta?.target?.includes('username')) {
        return apiError('Username is already taken', 409)
      }
      throw e
    }

    // Audit (non-blocking)
    const after: Record<string, unknown> = {}
    for (const key of Object.keys(data)) {
      after[key] = (updated as unknown as Record<string, unknown>)[key]
    }
    await recordAudit({
      userId: user.id,
      action: 'update',
      module: 'profile',
      entityType: 'User',
      entityId: user.id,
      details: 'Self profile update',
      before,
      after,
      ipAddress: getRequestIp(request),
    })

    return apiSuccess(updated)
  } catch (e) {
    console.error('Profile update error:', e)
    return apiError('Internal server error', 500)
  }
}
