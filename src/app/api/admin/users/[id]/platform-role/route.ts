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

    const isPromotion = nextRole !== null
    const isDemotion = nextRole === null

    const previousMemberships = await prisma.userRegionMembership.findMany({
      where: { userId: targetUserId },
      select: {
        regionId: true,
        role: true,
        status: true,
        isPrimary: true,
        region: { select: { slug: true, name: true } },
      },
    })

    const globalRegion = isDemotion
      ? await prisma.region.findFirst({ where: { slug: 'global' }, select: { id: true, slug: true, name: true } })
      : null

    if (isDemotion && !globalRegion) {
      console.warn('[platform-role] Global region not found — skipping auto-add on demotion for user', targetUserId)
    }

    type AddedGlobal = { regionId: string; slug: string; name: string; role: string; status: string }
    const clearedMemberships: typeof previousMemberships = []
    let addedGlobalMembership: AddedGlobal | null = null

    await prisma.$transaction(async (tx) => {
      if (isPromotion) {
        await tx.platformAdmin.upsert({
          where: { userId: targetUserId },
          create: { userId: targetUserId, role: nextRole },
          update: { role: nextRole },
        })

        if (previousMemberships.length > 0) {
          await tx.userRegionMembership.deleteMany({ where: { userId: targetUserId } })
          clearedMemberships.push(...previousMemberships)
        }
      } else {
        if (target.adminRole) {
          await tx.platformAdmin.delete({ where: { userId: targetUserId } })
        }

        if (globalRegion) {
          const existing = await tx.userRegionMembership.findUnique({
            where: { userId_regionId: { userId: targetUserId, regionId: globalRegion.id } },
            select: { id: true },
          })
          if (!existing) {
            await tx.userRegionMembership.create({
              data: {
                userId: targetUserId,
                regionId: globalRegion.id,
                role: 'member',
                status: 'accepted',
                isPrimary: true,
              },
            })
            const added: AddedGlobal = {
              regionId: globalRegion.id,
              slug: globalRegion.slug,
              name: globalRegion.name,
              role: 'member',
              status: 'accepted',
            }
            addedGlobalMembership = added
          }
        }
      }
    })

    let revokedRole: 'super_admin' | 'community_ops' | null = null
    let grantedRole: 'super_admin' | 'community_ops' | null = null

    if (isDemotion) {
      revokedRole = currentRole as 'super_admin' | 'community_ops'
    } else {
      grantedRole = nextRole
      if (currentRole && currentRole !== nextRole) {
        revokedRole = currentRole as 'super_admin' | 'community_ops'
      }
    }

    const beforeMembershipsSummary = previousMemberships.map((m) => ({
      regionSlug: m.region.slug,
      regionName: m.region.name,
      role: m.role,
      status: m.status,
      isPrimary: m.isPrimary,
    }))
    const addedRef: AddedGlobal | null = addedGlobalMembership
    let afterMembershipsSummary: typeof beforeMembershipsSummary
    if (isPromotion) {
      afterMembershipsSummary = []
    } else if (addedRef) {
      const a: AddedGlobal = addedRef
      afterMembershipsSummary = [
        ...beforeMembershipsSummary.filter((m) => m.regionSlug !== a.slug),
        {
          regionSlug: a.slug,
          regionName: a.name,
          role: a.role,
          status: a.status,
          isPrimary: true,
        },
      ]
    } else {
      afterMembershipsSummary = beforeMembershipsSummary
    }

    await recordAudit({
      userId: actor.id,
      action: nextRole === null ? 'revoke_platform_admin' : currentRole === null ? `grant_${nextRole}` : `change_platform_admin`,
      module: 'members',
      entityType: 'PlatformAdmin',
      entityId: targetUserId,
      details: nextRole === null
        ? `Revoked ${currentRole} from ${target.displayName}${addedGlobalMembership ? ' and added to Global region' : ''}`
        : currentRole === null
          ? `Granted ${nextRole} to ${target.displayName}${clearedMemberships.length > 0 ? ` and cleared ${clearedMemberships.length} region membership(s)` : ''}`
          : `Changed ${target.displayName} from ${currentRole} to ${nextRole}${clearedMemberships.length > 0 ? ` and cleared ${clearedMemberships.length} region membership(s)` : ''}`,
      before: { platformRole: currentRole, regionMemberships: beforeMembershipsSummary },
      after: { platformRole: nextRole, regionMemberships: afterMembershipsSummary },
      ipAddress: getRequestIp(request),
    })

    try {
      const grantSuffix = clearedMemberships.length > 0 ? 'Region memberships cleared.' : undefined
      const revokeSuffix = addedGlobalMembership ? 'Added to Global region.' : undefined

      if (revokedRole && grantedRole) {
        await notifyPlatformAdminRevoked(targetUserId, revokedRole, actor.id)
        await notifyPlatformAdminGranted(targetUserId, grantedRole, actor.id, grantSuffix)
      } else if (revokedRole) {
        await notifyPlatformAdminRevoked(targetUserId, revokedRole, actor.id, revokeSuffix)
      } else if (grantedRole) {
        await notifyPlatformAdminGranted(targetUserId, grantedRole, actor.id, grantSuffix)
      }
    } catch (e) {
      console.error('[platform-role] notification dispatch failed:', e)
    }

    return apiSuccess({
      id: target.id,
      platformRole: nextRole,
      regionMembershipsCleared: clearedMemberships.length,
      addedToGlobalRegion: !!addedGlobalMembership,
    })
  } catch (e) {
    console.error('Platform role update error:', e)
    return apiError('Internal server error', 500)
  }
}
