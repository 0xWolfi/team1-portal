import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError, parseRegionCountries } from '@/lib/auth'
import { applicationSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isPlatformAdmin = !!admin && (admin.role === 'super_admin' || admin.role === 'community_ops')

    let rolledUpCountries: string[] = []
    if (!isPlatformAdmin) {
      const leadMemberships = await prisma.userRegionMembership.findMany({
        where: { userId: user.id, role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
        select: { region: { select: { countries: true } } },
      })
      if (leadMemberships.length === 0) return apiError('Forbidden', 403)
      const set = new Set<string>()
      for (const m of leadMemberships) {
        for (const c of parseRegionCountries(m.region.countries)) set.add(c.toLowerCase())
      }
      rolledUpCountries = Array.from(set)
      // No countries configured → leads see no rolled-up applications.
      if (rolledUpCountries.length === 0) {
        return apiSuccess({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
      }
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 20

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (!isPlatformAdmin) {
      where.country = { in: rolledUpCountries, mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      prisma.membershipApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.membershipApplication.count({ where }),
    ])

    return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (e) {
    console.error('Applications GET error:', e)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = applicationSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    // Check if email already applied
    const existing = await prisma.membershipApplication.findUnique({
      where: { email: parsed.data.email },
    })
    if (existing) return apiError('An application with this email already exists', 409)

    const app = await prisma.membershipApplication.create({ data: parsed.data })
    return apiSuccess(app, 201)
  } catch (e) {
    console.error('Applications POST error:', e)
    return apiError('Internal server error', 500)
  }
}
