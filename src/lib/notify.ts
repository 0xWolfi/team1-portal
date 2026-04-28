import { prisma } from './db'
import { formatRoleLabel } from './helpers'

interface NotifyArgs {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning'
  link?: string | null
}

/** Insert a single Notification row. Swallows errors so callers don't fail. */
export async function notifyUser(args: NotifyArgs): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        title: args.title,
        message: args.message,
        type: args.type ?? 'info',
        link: args.link ?? null,
      },
    })
  } catch (e) {
    console.error('[notify] failed to write notification:', e)
  }
}

/** Insert the same notification for every super_admin. */
export async function notifyAllAdmins(args: Omit<NotifyArgs, 'userId'>): Promise<void> {
  try {
    const admins = await prisma.platformAdmin.findMany({ select: { userId: true } })
    if (admins.length === 0) return
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.userId,
        title: args.title,
        message: args.message,
        type: args.type ?? 'info',
        link: args.link ?? null,
      })),
    })
  } catch (e) {
    console.error('[notify] failed to fan out admin notifications:', e)
  }
}

const ROLE_RANK: Record<string, number> = { member: 0, co_lead: 1, lead: 2 }

async function getRegionAdminAndLeadRecipients(regionId: string, excludeUserId?: string): Promise<string[]> {
  const [admins, regionLeads] = await Promise.all([
    prisma.platformAdmin.findMany({ select: { userId: true } }),
    prisma.userRegionMembership.findMany({
      where: { regionId, role: { in: ['lead', 'co_lead'] }, status: 'accepted' },
      select: { userId: true },
    }),
  ])
  const set = new Set<string>()
  for (const a of admins) set.add(a.userId)
  for (const m of regionLeads) set.add(m.userId)
  if (excludeUserId) set.delete(excludeUserId)
  return Array.from(set)
}

async function getOtherSuperAdminRecipients(excludeUserIds: string[]): Promise<string[]> {
  const supers = await prisma.platformAdmin.findMany({
    where: { role: 'super_admin' },
    select: { userId: true },
  })
  const set = new Set(supers.map((s) => s.userId))
  for (const id of excludeUserIds) set.delete(id)
  return Array.from(set)
}

export async function notifyMemberJoined(
  userId: string,
  regionId: string,
  role: string,
  actorId?: string,
): Promise<void> {
  try {
    const [user, region] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.region.findUnique({ where: { id: regionId }, select: { name: true } }),
    ])
    if (!user || !region) return

    const roleLabel = formatRoleLabel(role)
    const link = `/admin/members?id=${userId}`
    const recipients = await getRegionAdminAndLeadRecipients(regionId, userId)

    const rows: {
      userId: string
      title: string
      message: string
      type: string
      link: string | null
    }[] = []

    for (const rid of recipients) {
      if (actorId && rid === actorId) continue
      rows.push({
        userId: rid,
        title: 'New member joined',
        message: `${user.displayName} joined ${region.name} as ${roleLabel}.`,
        type: 'info',
        link,
      })
    }

    rows.push({
      userId,
      title: `Welcome to ${region.name}`,
      message: `Welcome to ${region.name}! You've joined as ${roleLabel}.`,
      type: 'info',
      link: '/dashboard',
    })

    if (rows.length === 0) return
    await prisma.notification.createMany({ data: rows })
  } catch (e) {
    console.error('[notify] notifyMemberJoined failed:', e)
  }
}

export async function notifyMemberRoleChanged(
  userId: string,
  regionId: string,
  oldRole: string,
  newRole: string,
  actorId?: string,
): Promise<void> {
  try {
    if (oldRole === newRole) return
    const [user, region] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.region.findUnique({ where: { id: regionId }, select: { name: true } }),
    ])
    if (!user || !region) return

    const newLabel = formatRoleLabel(newRole)
    const oldRank = ROLE_RANK[oldRole] ?? -1
    const newRank = ROLE_RANK[newRole] ?? -1
    const promoted = newRank > oldRank
    const link = `/admin/members?id=${userId}`
    const recipients = await getRegionAdminAndLeadRecipients(regionId, userId)

    const adminVerb = promoted ? 'was promoted to' : 'was changed to'
    const adminMessage = `${user.displayName} ${adminVerb} ${newLabel} in ${region.name}.`
    const selfMessage = promoted
      ? `You were promoted to ${newLabel} in ${region.name}.`
      : `Your role in ${region.name} was changed to ${newLabel}.`
    const selfTitle = promoted ? 'You were promoted' : 'Role updated'
    const adminTitle = promoted ? 'Member promoted' : 'Member role changed'

    const rows: {
      userId: string
      title: string
      message: string
      type: string
      link: string | null
    }[] = []

    for (const rid of recipients) {
      if (actorId && rid === actorId) continue
      rows.push({
        userId: rid,
        title: adminTitle,
        message: adminMessage,
        type: 'info',
        link,
      })
    }

    rows.push({
      userId,
      title: selfTitle,
      message: selfMessage,
      type: 'info',
      link: '/dashboard',
    })

    if (rows.length === 0) return
    await prisma.notification.createMany({ data: rows })
  } catch (e) {
    console.error('[notify] notifyMemberRoleChanged failed:', e)
  }
}

export async function notifyPlatformAdminGranted(
  userId: string,
  role: 'super_admin' | 'community_ops',
  actorId: string,
  extraMessage?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } })
    if (!user) return

    const roleLabel = formatRoleLabel(role)
    const link = `/admin/members?id=${userId}`
    const recipients = await getOtherSuperAdminRecipients([actorId, userId])
    const suffix = extraMessage ? ` ${extraMessage}` : ''

    const rows: {
      userId: string
      title: string
      message: string
      type: string
      link: string | null
    }[] = []

    for (const rid of recipients) {
      rows.push({
        userId: rid,
        title: 'Platform admin granted',
        message: `${user.displayName} was made a ${roleLabel}.${suffix}`,
        type: 'info',
        link,
      })
    }

    rows.push({
      userId,
      title: `You were made a ${roleLabel}`,
      message: `You were made a ${roleLabel}.${suffix}`,
      type: 'info',
      link: '/dashboard',
    })

    if (rows.length === 0) return
    await prisma.notification.createMany({ data: rows })
  } catch (e) {
    console.error('[notify] notifyPlatformAdminGranted failed:', e)
  }
}

export async function notifyPlatformAdminRevoked(
  userId: string,
  role: 'super_admin' | 'community_ops',
  actorId: string,
  extraMessage?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } })
    if (!user) return

    const roleLabel = formatRoleLabel(role)
    const link = `/admin/members?id=${userId}`
    const recipients = await getOtherSuperAdminRecipients([actorId, userId])
    const suffix = extraMessage ? ` ${extraMessage}` : ''

    const rows: {
      userId: string
      title: string
      message: string
      type: string
      link: string | null
    }[] = []

    for (const rid of recipients) {
      rows.push({
        userId: rid,
        title: 'Platform admin removed',
        message: `${user.displayName}'s ${roleLabel} access was removed.${suffix}`,
        type: 'warning',
        link,
      })
    }

    rows.push({
      userId,
      title: `Your ${roleLabel} access was removed`,
      message: `Your ${roleLabel} access was removed.${suffix}`,
      type: 'warning',
      link: '/dashboard',
    })

    if (rows.length === 0) return
    await prisma.notification.createMany({ data: rows })
  } catch (e) {
    console.error('[notify] notifyPlatformAdminRevoked failed:', e)
  }
}
