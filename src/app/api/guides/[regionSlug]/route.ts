import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { guideSchema } from '@/lib/validations'
import { slugify } from '@/lib/helpers'

export async function GET(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { regionSlug } = await params
    const region = await prisma.region.findUnique({ where: { slug: regionSlug } })
    if (!region) return apiError('Region not found', 404)

    const guides = await prisma.guide.findMany({
      where: { regionId: region.id, status: 'published' },
      orderBy: { createdAt: 'desc' },
      include: {
        region: { select: { name: true, slug: true } },
        creator: { select: { displayName: true, username: true } },
      },
    })
    return apiSuccess(guides)
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
    const slug = body.slug || slugify(body.title || '')
    const parsed = guideSchema.safeParse({ ...body, slug, regionId: region.id })
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    // Ensure slug uniqueness
    const existingSlug = await prisma.guide.findUnique({ where: { slug: parsed.data.slug } })
    const finalSlug = existingSlug ? `${parsed.data.slug}-${Date.now().toString(36)}` : parsed.data.slug!

    const guide = await prisma.guide.create({
      data: { ...parsed.data, slug: finalSlug, createdById: user.id },
      include: { region: { select: { name: true, slug: true } }, creator: { select: { displayName: true, username: true } } },
    })
    return apiSuccess(guide, 201)
  } catch (e) {
    console.error('Guide POST error:', e)
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ regionSlug: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { id, ...data } = body
    if (!id) return apiError('Guide ID required', 422)

    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    const guide = await prisma.guide.findUnique({ where: { id } })
    if (!guide) return apiError('Not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: guide.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    const updated = await prisma.guide.update({
      where: { id },
      data: { title: data.title, category: data.category, content: data.content, coverImageUrl: data.coverImageUrl, readTime: data.readTime, visibility: data.visibility, status: data.status },
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
    const guide = await prisma.guide.findUnique({ where: { id } })
    if (!guide) return apiError('Not found', 404)

    const isLead = await prisma.userRegionMembership.findFirst({
      where: { userId: user.id, regionId: guide.regionId, role: { in: ['lead', 'co_lead'] } },
    })
    if (!admin && !isLead) return apiError('Forbidden', 403)

    await prisma.guide.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
