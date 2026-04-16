import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'

/**
 * PATCH /api/admin/users/[id]
 *
 * Admin-only fields (status enum, admin notes, regional-TG flag, cohort).
 * Region leads may only set `inRegionalTg` for members in their region.
 */

const ADMIN_ONLY_FIELDS = ['status', 'adminNotes', 'cohort'] as const
const LEAD_OR_ADMIN_FIELDS = ['inRegionalTg'] as const
const ALL_FIELDS = [...ADMIN_ONLY_FIELDS, ...LEAD_OR_ADMIN_FIELDS] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)

    const isAdmin = !!(await prisma.platformAdmin.findUnique({ where: { userId: actor.id } }))

    const { id: targetUserId } = await params
    const body = await request.json()

    // Region-lead can only touch lead-or-admin fields, and only for members in their region.
    if (!isAdmin) {
      const touchesAdminOnly = ADMIN_ONLY_FIELDS.some((f) => body[f] !== undefined)
      if (touchesAdminOnly) return apiError('Forbidden', 403)

      const targetMemberships = await prisma.userRegionMembership.findMany({
        where: { userId: targetUserId, status: 'accepted' },
        select: { regionId: true },
      })
      const actorLeadRegions = await prisma.userRegionMembership.findMany({
        where: { userId: actor.id, role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
        select: { regionId: true },
      })
      const overlap = targetMemberships.some((t) =>
        actorLeadRegions.some((a) => a.regionId === t.regionId),
      )
      if (!overlap) return apiError('Forbidden', 403)
    }

    const data: Record<string, unknown> = {}
    for (const f of ALL_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (data.status !== undefined && !['active', 'flagged', 'paused', 'inactive', 'removed'].includes(String(data.status))) {
      return apiError('Invalid status value', 422)
    }
    if (data.cohort !== undefined && data.cohort !== null) {
      const n = typeof data.cohort === 'string' ? parseInt(data.cohort, 10) : Number(data.cohort)
      data.cohort = Number.isFinite(n) ? n : null
    }

    if (Object.keys(data).length === 0) {
      return apiError('No editable fields supplied', 422)
    }

    const before = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { status: true, adminNotes: true, cohort: true, inRegionalTg: true, displayName: true },
    })
    if (!before) return apiError('User not found', 404)

    const updated = await prisma.user.update({ where: { id: targetUserId }, data })

    const beforeSnapshot: Record<string, unknown> = {}
    const afterSnapshot: Record<string, unknown> = {}
    for (const k of Object.keys(data)) {
      beforeSnapshot[k] = (before as unknown as Record<string, unknown>)[k]
      afterSnapshot[k] = (updated as unknown as Record<string, unknown>)[k]
    }

    await recordAudit({
      userId: actor.id,
      action: 'admin_update',
      module: 'members',
      entityType: 'User',
      entityId: targetUserId,
      details: `Admin updated profile fields for ${before.displayName}`,
      before: beforeSnapshot,
      after: afterSnapshot,
      ipAddress: getRequestIp(request),
    })

    return apiSuccess({ id: updated.id, ...afterSnapshot })
  } catch (e) {
    console.error('Admin user update error:', e)
    return apiError('Internal server error', 500)
  }
}
