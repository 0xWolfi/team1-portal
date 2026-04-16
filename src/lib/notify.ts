import { prisma } from './db'

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
