import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { notifyUser } from '@/lib/notify'
import { z } from 'zod'

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(2000).optional(),
})

/**
 * PATCH /api/admin/role-requests/[id]
 * Admin approves or rejects a role request. On approval, the role is appended
 * to the user's roles JSON array. The requester is notified either way.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)
    const isAdmin = await prisma.platformAdmin.findUnique({ where: { userId: actor.id } })
    if (!isAdmin) return apiError('Forbidden', 403)

    const { id } = await params
    const body = await request.json()
    const parsed = decisionSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'Validation error', 422)

    const req = await prisma.memberRoleRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, displayName: true, roles: true } } },
    })
    if (!req) return apiError('Request not found', 404)
    if (req.status !== 'pending') return apiError('Request has already been reviewed', 409)

    const newStatus = parsed.data.decision === 'approve' ? 'approved' : 'rejected'

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.memberRoleRequest.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedBy: actor.id,
          reviewNote: parsed.data.note ?? null,
          reviewedAt: new Date(),
        },
      })

      // On approval, merge the role into the user's roles JSON array.
      if (newStatus === 'approved') {
        const current: string[] = parseRoles(req.user.roles)
        if (!current.includes(req.role)) {
          current.push(req.role)
          await tx.user.update({
            where: { id: req.userId },
            data: { roles: JSON.stringify(current) },
          })
        }
      }

      return r
    })

    await Promise.all([
      recordAudit({
        userId: actor.id,
        action: newStatus === 'approved' ? 'approve_role' : 'reject_role',
        module: 'roles',
        entityType: 'MemberRoleRequest',
        entityId: id,
        details: `Role "${req.role}" ${newStatus} for ${req.user.displayName}`,
        before: { status: 'pending' },
        after: { status: newStatus, reviewNote: parsed.data.note ?? null },
        ipAddress: getRequestIp(request),
      }),
      notifyUser({
        userId: req.userId,
        title: newStatus === 'approved' ? 'Role approved' : 'Role request rejected',
        message:
          newStatus === 'approved'
            ? `Your request for the role "${req.role}" was approved.`
            : `Your request for the role "${req.role}" was rejected${parsed.data.note ? `: ${parsed.data.note}` : '.'}`,
        type: newStatus === 'approved' ? 'success' : 'warning',
        link: '/profile/settings',
      }),
    ])

    return apiSuccess(updated)
  } catch (e) {
    console.error('Role request decision error:', e)
    return apiError('Internal server error', 500)
  }
}

function parseRoles(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
