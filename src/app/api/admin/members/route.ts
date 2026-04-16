import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const regionId = searchParams.get('regionId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 20

    const userWhere: Record<string, unknown> = {
      memberships: {
        some: {
          status: 'accepted',
          ...(regionId ? { regionId } : {}),
        },
      },
    }
    if (search) {
      userWhere.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
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
          createdAt: true,
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
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const body = await request.json()
    const { email, userId, regionId, role = 'member' } = body

    if (!regionId) return apiError('regionId is required', 422)
    if (!email && !userId) return apiError('email or userId is required', 422)

    // Look up user by email if userId not provided
    let targetUserId = userId
    if (email && !userId) {
      const targetUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
      if (!targetUser) return apiError('No account found with this email. The user must sign up first.', 404)
      targetUserId = targetUser.id
    }

    const existing = await prisma.userRegionMembership.findUnique({
      where: { userId_regionId: { userId: targetUserId, regionId } },
    })
    if (existing) return apiError('User already has membership in this region', 409)

    const membership = await prisma.userRegionMembership.create({
      data: { userId: targetUserId, regionId, role, status: 'accepted', isPrimary: false },
      include: { user: { select: { displayName: true, email: true } }, region: { select: { name: true } } },
    })

    return apiSuccess(membership, 201)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
