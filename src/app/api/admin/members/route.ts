import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError, parseRegionCountries } from '@/lib/auth'
import { sendMemberAddedMail } from '@/lib/mailer'
import { memberAssignmentSchema } from '@/lib/validations'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { notifyMemberJoined, notifyPlatformAdminGranted } from '@/lib/notify'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isPlatformAdmin = !!admin && (admin.role === 'super_admin' || admin.role === 'community_ops')

    let leadRegionIds: string[] = []
    let rolledUpCountries: string[] = []
    if (!isPlatformAdmin) {
      const leadMemberships = await prisma.userRegionMembership.findMany({
        where: { userId: user.id, role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
        select: { regionId: true, region: { select: { countries: true } } },
      })
      if (leadMemberships.length === 0) return apiError('Forbidden', 403)
      leadRegionIds = leadMemberships.map((m) => m.regionId)
      const set = new Set<string>()
      for (const m of leadMemberships) {
        for (const c of parseRegionCountries(m.region.countries)) set.add(c.toLowerCase())
      }
      rolledUpCountries = Array.from(set)
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const regionId = searchParams.get('regionId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 20

    const scopeOr: Record<string, unknown>[] = []
    if (isPlatformAdmin) {
      scopeOr.push({
        memberships: {
          some: {
            status: 'accepted',
            ...(regionId ? { regionId } : {}),
          },
        },
      })
    } else {
      scopeOr.push({
        memberships: {
          some: {
            status: 'accepted',
            regionId: regionId ? regionId : { in: leadRegionIds },
          },
        },
      })
      if (rolledUpCountries.length > 0 && !regionId) {
        scopeOr.push({
          country: { in: rolledUpCountries, mode: 'insensitive' },
        })
      }
    }

    const userWhere: Record<string, unknown> = scopeOr.length === 1 ? scopeOr[0] : { OR: scopeOr }
    if (search) {
      const searchClause = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
      userWhere.AND = [{ OR: searchClause }]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          email: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          bio: true,
          status: true,
          isActive: true,
          createdAt: true,
          adminRole: { select: { role: true } },
          memberships: {
            where: { status: 'accepted' },
            select: {
              id: true,
              role: true,
              status: true,
              isPrimary: true,
              createdAt: true,
              region: { select: { id: true, name: true, slug: true } },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where: userWhere }),
    ])

    const items = users.map((u) => {
      const { memberships, ...userFields } = u
      const primary = memberships[0]
      return {
        id: primary?.id ?? u.id,
        role: primary?.role ?? 'member',
        status: primary?.status ?? 'accepted',
        createdAt: primary?.createdAt ?? u.createdAt,
        user: userFields,
        memberships,
      }
    })

    return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isSuper = !!admin && admin.role === 'super_admin'
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const body = await request.json()
    const parsed = memberAssignmentSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { email, userId, regionId, role } = parsed.data

    if (!email && !userId) return apiError('email or userId is required', 422)

    // Only super admins can grant platform-wide admin roles
    if ((role === 'super_admin' || role === 'community_ops') && !isSuper) {
      return apiError(`Forbidden: only super admins can grant ${role}`, 403)
    }

    // Look up user by email if userId not provided; auto-create if they don't exist yet
    let targetUserId: string = userId || ''
    let targetEmail = email?.toLowerCase().trim() || ''
    let targetDisplayName = ''
    if (email && !userId) {
      const normalizedEmail = email.toLowerCase().trim()
      let targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (!targetUser) {
        // Auto-create the user so they can sign in later via Google
        targetUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            displayName: normalizedEmail.split('@')[0],
            emailVerified: false,
          },
        })
      }
      targetUserId = targetUser.id
      targetEmail = targetUser.email
      targetDisplayName = targetUser.displayName
    } else if (userId) {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } })
      if (!targetUser) return apiError('User not found', 404)
      targetEmail = targetUser.email
      targetDisplayName = targetUser.displayName
    }

    // Platform-wide admin grant (super_admin / community_ops): upsert PlatformAdmin row, no region membership
    if (role === 'super_admin' || role === 'community_ops') {
      const adminRow = await prisma.platformAdmin.upsert({
        where: { userId: targetUserId },
        create: { userId: targetUserId, role },
        update: { role },
      })

      await recordAudit({
        userId: user.id,
        action: role === 'super_admin' ? 'grant_super_admin' : 'grant_community_ops',
        module: 'members',
        entityType: 'PlatformAdmin',
        entityId: adminRow.id,
        details: `Granted ${role} to ${targetDisplayName} (${targetEmail})`,
        after: { role, userId: targetUserId },
        ipAddress: getRequestIp(request),
      })

      await notifyPlatformAdminGranted(targetUserId, role, user.id)

      return apiSuccess(adminRow, 201)
    }

    // Region-scoped role: existing flow
    if (!regionId) return apiError('Region is required', 422)
    const targetRegionId: string = regionId

    // Cross-region check: leads can only add members to their own regions
    if (!admin) {
      const leadRegion = await prisma.userRegionMembership.findFirst({
        where: { userId: user.id, regionId: targetRegionId, role: { in: ['lead', 'co_lead'] } },
      })
      if (!leadRegion) return apiError('Forbidden: you are not a lead for this region', 403)
    }

    const existing = await prisma.userRegionMembership.findUnique({
      where: { userId_regionId: { userId: targetUserId, regionId: targetRegionId } },
    })
    if (existing) return apiError('User already has membership in this region', 409)

    const membership = await prisma.userRegionMembership.create({
      data: { userId: targetUserId, regionId: targetRegionId, role, status: 'accepted', isPrimary: false },
      include: { user: { select: { displayName: true, email: true } }, region: { select: { name: true } } },
    })

    // Non-blocking: send welcome email to the added member
    sendMemberAddedMail({
      toEmail: membership.user.email,
      toName: membership.user.displayName,
      regionName: membership.region.name,
      role,
    }).catch(() => {})

    await notifyMemberJoined(targetUserId, targetRegionId, role, user.id)

    return apiSuccess(membership, 201)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
