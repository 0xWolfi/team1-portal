import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'

/**
 * PATCH /api/admin/users/[id]
 *
 * Admin + region-lead fields (status enum, admin notes, regional-TG flag, cohort).
 * Region leads may set status (for members in their region) and `inRegionalTg`;
 * super admins may set anything in the list.
 */

const ADMIN_OR_LEAD_FIELDS = ['status', 'inRegionalTg'] as const
const ADMIN_ONLY_FIELDS = ['adminNotes', 'cohort'] as const
const ALL_FIELDS = [...ADMIN_OR_LEAD_FIELDS, ...ADMIN_ONLY_FIELDS] as const

const VALID_STATUSES = ['active', 'flagged', 'paused', 'inactive', 'removed'] as const
const STATUS_TO_IS_ACTIVE: Record<(typeof VALID_STATUSES)[number], boolean> = {
  active: true,
  flagged: true,
  paused: true,
  inactive: false,
  removed: false,
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)

    const adminRow = await prisma.platformAdmin.findUnique({ where: { userId: actor.id } })
    const isSuper = !!adminRow && adminRow.role === 'super_admin'
    const isOps = !!adminRow && adminRow.role === 'community_ops'
    const isAdmin = isSuper || isOps

    const { id: targetUserId } = await params
    const body = await request.json()

    // community_ops: only status / inRegionalTg allowed (no admin notes, no cohort, no role/profile fields)
    if (isOps) {
      const allowed = new Set<string>(ADMIN_OR_LEAD_FIELDS as readonly string[])
      const supplied = Object.keys(body).filter((k) => body[k] !== undefined)
      const hasDisallowed = supplied.some((k) => !allowed.has(k))
      if (hasDisallowed) return apiError('Forbidden: community_ops can only edit status and inRegionalTg', 403)
    }

    // Region-lead can only touch admin-or-lead fields, and only for members in their region.
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
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status as (typeof VALID_STATUSES)[number])) {
      return apiError('Invalid status value', 422)
    }
    if (data.cohort !== undefined && data.cohort !== null) {
      const n = typeof data.cohort === 'string' ? parseInt(data.cohort, 10) : Number(data.cohort)
      data.cohort = Number.isFinite(n) ? n : null
    }

    if (Object.keys(data).length === 0) {
      return apiError('No editable fields supplied', 422)
    }

    // When status changes, mirror it onto isActive so login/directory filters stay in sync.
    if (data.status !== undefined) {
      const statusKey = data.status as (typeof VALID_STATUSES)[number]
      data.isActive = STATUS_TO_IS_ACTIVE[statusKey]
    }

    const before = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { status: true, isActive: true, adminNotes: true, cohort: true, inRegionalTg: true, displayName: true },
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
