import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { z } from 'zod'

const KNOWN_TYPES = ['organized_event', 'attended_event', 'submitted_pr', 'created_content', 'other'] as const

const activitySchema = z.object({
  type: z.string().min(1).max(60),                  // dropdown OR freetext
  typeOther: z.string().max(120).optional(),        // detail when type === "other"
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1, 'Date is required'),
  link: z.string().url().optional().or(z.literal('')),
  visibility: z.number().int().min(0).max(3).optional(),
  includeInReport: z.boolean().optional(),
})

const updateSchema = activitySchema.partial().extend({ id: z.string().min(1) })

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Members can only fetch their own activities here.
    // Region leads / admins use /api/admin/activities instead.
    if (userId !== user.id) return apiError('Forbidden', 403)

    const activities = await prisma.memberActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return apiSuccess(activities.map(serialize))
  } catch (e: any) {
    return apiError(e.message || 'Server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const parsed = activitySchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validation error')
    }
    const d = parsed.data
    const typeOther = d.type === 'other' || !KNOWN_TYPES.includes(d.type as any) ? (d.typeOther || (KNOWN_TYPES.includes(d.type as any) ? null : d.type)) : null

    const activity = await prisma.memberActivity.create({
      data: {
        userId: user.id,
        type: d.type,
        typeOther,
        title: d.title,
        description: d.description || null,
        date: new Date(d.date),
        link: d.link || null,
        source: 'manual',
        visibility: d.visibility ?? 1,
        includeInReport: d.includeInReport ?? true,
      },
    })

    await recordAudit({
      userId: user.id,
      action: 'create',
      module: 'activities',
      entityType: 'MemberActivity',
      entityId: activity.id,
      details: `Created activity "${activity.title}"`,
      after: { type: activity.type, title: activity.title, date: activity.date.toISOString(), visibility: activity.visibility, includeInReport: activity.includeInReport },
      ipAddress: getRequestIp(request),
    })

    return apiSuccess(serialize(activity))
  } catch (e: any) {
    return apiError(e.message || 'Server error', 500)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'Validation error')

    const existing = await prisma.memberActivity.findUnique({ where: { id: parsed.data.id } })
    if (!existing) return apiError('Not found', 404)

    const isAdmin = !!(await prisma.platformAdmin.findUnique({ where: { userId: user.id } }))
    if (existing.userId !== user.id && !isAdmin) return apiError('Forbidden', 403)

    const data: Record<string, unknown> = {}
    if (parsed.data.type !== undefined) data.type = parsed.data.type
    if (parsed.data.typeOther !== undefined) data.typeOther = parsed.data.typeOther || null
    if (parsed.data.title !== undefined) data.title = parsed.data.title
    if (parsed.data.description !== undefined) data.description = parsed.data.description || null
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date)
    if (parsed.data.link !== undefined) data.link = parsed.data.link || null
    if (parsed.data.visibility !== undefined) data.visibility = parsed.data.visibility
    if (parsed.data.includeInReport !== undefined) data.includeInReport = parsed.data.includeInReport

    const updated = await prisma.memberActivity.update({ where: { id: existing.id }, data })

    await recordAudit({
      userId: user.id,
      action: 'update',
      module: 'activities',
      entityType: 'MemberActivity',
      entityId: existing.id,
      details: `Updated activity "${updated.title}"`,
      before: pickActivityFields(existing),
      after: pickActivityFields(updated),
      ipAddress: getRequestIp(request),
    })

    return apiSuccess(serialize(updated))
  } catch (e: any) {
    return apiError(e.message || 'Server error', 500)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return apiError('ID is required')

    const activity = await prisma.memberActivity.findUnique({ where: { id } })
    if (!activity) return apiError('Not found', 404)

    const isAdmin = !!(await prisma.platformAdmin.findUnique({ where: { userId: user.id } }))
    if (activity.userId !== user.id && !isAdmin) return apiError('Forbidden', 403)

    await prisma.memberActivity.delete({ where: { id } })

    await recordAudit({
      userId: user.id,
      action: 'delete',
      module: 'activities',
      entityType: 'MemberActivity',
      entityId: id,
      details: `Deleted activity "${activity.title}"`,
      before: pickActivityFields(activity),
      ipAddress: getRequestIp(request),
    })

    return apiSuccess({ deleted: true })
  } catch (e: any) {
    return apiError(e.message || 'Server error', 500)
  }
}

function serialize(a: any) {
  return {
    ...a,
    date: a.date.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt ? a.updatedAt.toISOString() : undefined,
  }
}

function pickActivityFields(a: any) {
  return {
    type: a.type,
    typeOther: a.typeOther,
    title: a.title,
    description: a.description,
    date: a.date instanceof Date ? a.date.toISOString() : a.date,
    link: a.link,
    visibility: a.visibility,
    includeInReport: a.includeInReport,
    source: a.source,
  }
}
