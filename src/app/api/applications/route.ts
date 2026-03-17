import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { applicationSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    // Check if super admin
    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 20

    const where = status ? { status } : {}
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
