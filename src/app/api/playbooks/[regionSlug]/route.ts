import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { playbookSchema, playbookUpdateSchema } from '@/lib/validations'

export async function GET(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { regionSlug } = await params
    const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
    if (!region) return apiError('Region not found', 404)

    const playbooks = await prisma.playbook.findMany({
      where: { regionId: region.id, status: 'published' },
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true, username: true } },
      },
    })
    return apiSuccess(playbooks)
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

    // Check if user is admin or region lead
    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: region.id, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const body = await request.json()
    const parsed = playbookSchema.safeParse({ ...body, regionId: region.id })
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const playbook = await prisma.playbook.create({
      data: { ...parsed.data, createdById: user.id },
      include: { region: { select: { name: true, slug: true } }, creator: { select: { displayName: true, username: true } } },
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'create', module: 'playbooks', entityType: 'Playbook', entityId: playbook.id },
    })

    return apiSuccess(playbook, 201)
  } catch (e) {
    console.error('Playbook POST error:', e)
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { id, ...data } = body

    if (!id) return apiError('Playbook ID required', 422)

    const parsed = playbookUpdateSchema.safeParse(data)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const playbook = await prisma.playbook.findUnique({ where: { id } })
    if (!playbook) return apiError('Playbook not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: playbook.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const updated = await prisma.playbook.update({
      where: { id },
      data: parsed.data,
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
    const playbook = await prisma.playbook.findUnique({ where: { id } })
    if (!playbook) return apiError('Not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: playbook.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    await prisma.playbook.delete({ where: { id } })
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'delete', module: 'playbooks', entityType: 'Playbook', entityId: id },
    })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
