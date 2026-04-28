import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { notifyPlatformAdminGranted, notifyPlatformAdminRevoked } from '@/lib/notify'
import { platformRoleUpdateSchema } from '@/lib/validations'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return apiError('Unauthorized', 401)

    const actorAdmin = await prisma.platformAdmin.findUnique({ where: { userId: actor.id } })
    const isSuper = !!actorAdmin && actorAdmin.role === 'super_admin'
    if (!isSuper) return apiError('Forbidden: only super admins can change platform admin roles', 403)

    const { id: targetUserId } = await params

    const body = await request.json()
    const parsed = platformRoleUpdateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const nextRole = parsed.data.platformRole

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, adminRole: { select: { id: true, role: true } } },
    })
    if (!target) return apiError('User not found', 404)

    const currentRole = target.adminRole?.role ?? null

    if (currentRole === nextRole) {
      return apiSuccess({ id: target.id, platformRole: currentRole })
    }

    if (currentRole === 'super_admin' && nextRole !== 'super_admin') {
      const remaining = await prisma.platformAdmin.count({ where: { role: 'super_admin' } })
      if (remaining <= 1) {
        return apiError('Cannot revoke — at least one super admin must exist.', 400)
      }
    }

    let revokedRole: 'super_admin' | 'community_ops' | null = null
    let grantedRole: 'super_admin' | 'community_ops' | null = null

    if (nextRole === null) {
      if (target.adminRole) {
        await prisma.platformAdmin.delete({ where: { userId: targetUserId } })
        revokedRole = (currentRole as 'super_admin' | 'community_ops')
      }
    } else {
      await prisma.platformAdmin.upsert({
        where: { userId: targetUserId },
        create: { userId: targetUserId, role: nextRole },
        update: { role: nextRole },
      })
      grantedRole = nextRole
      if (currentRole && currentRole !== nextRole) {
        revokedRole = currentRole as 'super_admin' | 'community_ops'
      }
    }

    await recordAudit({
      userId: actor.id,
      action: nextRole === null ? 'revoke_platform_admin' : currentRole === null ? `grant_${nextRole}` : `change_platform_admin`,
      module: 'members',
      entityType: 'PlatformAdmin',
      entityId: targetUserId,
      details: nextRole === null
        ? `Revoked ${currentRole} from ${target.displayName}`
        : currentRole === null
          ? `Granted ${nextRole} to ${target.displayName}`
          : `Changed ${target.displayName} from ${currentRole} to ${nextRole}`,
      before: { platformRole: currentRole },
      after: { platformRole: nextRole },
      ipAddress: getRequestIp(request),
    })

    try {
      if (revokedRole) {
        await notifyPlatformAdminRevoked(targetUserId, revokedRole, actor.id)
      }
      if (grantedRole) {
        await notifyPlatformAdminGranted(targetUserId, grantedRole, actor.id)
      }
    } catch (e) {
      console.error('[platform-role] notification dispatch failed:', e)
    }

    return apiSuccess({ id: target.id, platformRole: nextRole })
  } catch (e) {
    console.error('Platform role update error:', e)
    return apiError('Internal server error', 500)
  }
}
