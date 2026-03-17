import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { programSchema } from '@/lib/validations'

export async function GET(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { regionSlug } = await params
    const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
    if (!region) return apiError('Region not found', 404)

    const programs = await prisma.program.findMany({
      where: { regionId: region.id, status: { in: ['active', 'completed'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true, username: true } },
      },
    })
    return apiSuccess(programs)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { regionSlug } = await params
    const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
    if (!region) return apiError('Region not found', 404)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: region.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const body = await request.json()
    const parsed = programSchema.safeParse({ ...body, regionId: region.id })
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { startsAt, endsAt, ...rest } = parsed.data
    const program = await prisma.program.create({
      data: {
        ...rest,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: user.id,
      },
      include: { region: { select: { name: true, slug: true } }, creator: { select: { displayName: true, username: true } } },
    })

    return apiSuccess(program, 201)
  } catch (e) {
    console.error('Program POST error:', e)
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { id, ...data } = body
    if (!id) return apiError('Program ID required', 422)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const program = await prisma.program.findUnique({ where: { id } })
    if (!program) return apiError('Not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: program.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const updated = await prisma.program.update({
      where: { id },
      data: {
        title: data.title, description: data.description, content: data.content,
        eligibility: data.eligibility, benefits: data.benefits, status: data.status,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
      include: { region: { select: { name: true, slug: true } }, creator: { select: { displayName: true, username: true } } },
    })
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return apiError('ID required', 422)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const program = await prisma.program.findUnique({ where: { id } })
    if (!program) return apiError('Not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: program.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    await prisma.program.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
