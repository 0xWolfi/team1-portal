import { prisma } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { z } from 'zod'

/**
 * POST /api/webhooks/discord/activity
 *
 * Inbound webhook for the Discord bot to write activities on behalf of members.
 * Authentication: shared secret in `Authorization: Bearer <DISCORD_BOT_WEBHOOK_SECRET>`.
 *
 * The bot resolves the Discord username/id to an email out-of-band and submits it.
 * We resolve to a User by `discord` handle or `email`.
 */

const payloadSchema = z.object({
  email: z.string().email().optional(),
  discord: z.string().optional(),
  type: z.string().min(1).max(60),
  typeOther: z.string().max(120).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1),
  link: z.string().url().optional(),
  visibility: z.number().int().min(0).max(3).optional(),
  includeInReport: z.boolean().optional(),
}).refine((d) => !!d.email || !!d.discord, { message: 'email or discord is required' })

export async function POST(request: Request) {
  try {
    const expected = process.env.DISCORD_BOT_WEBHOOK_SECRET
    if (!expected) return apiError('Webhook not configured', 503)

    const auth = request.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
      return apiError('Unauthorized', 401)
    }

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'Validation error', 422)
    const d = parsed.data

    const target = await prisma.user.findFirst({
      where: {
        OR: [
          d.email ? { email: d.email.toLowerCase().trim() } : undefined,
          d.discord ? { discord: d.discord } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, displayName: true },
    })
    if (!target) return apiError('No matching member', 404)

    const activity = await prisma.memberActivity.create({
      data: {
        userId: target.id,
        type: d.type,
        typeOther: d.typeOther ?? null,
        title: d.title,
        description: d.description ?? null,
        date: new Date(d.date),
        link: d.link ?? null,
        source: 'discord-bot',
        visibility: d.visibility ?? 1,
        includeInReport: d.includeInReport ?? true,
      },
    })

    await recordAudit({
      userId: null,
      action: 'create',
      module: 'activities',
      entityType: 'MemberActivity',
      entityId: activity.id,
      details: `discord-bot logged activity for ${target.displayName}`,
      after: { type: activity.type, title: activity.title, source: 'discord-bot' },
      ipAddress: getRequestIp(request),
    })

    return apiSuccess({
      ...activity,
      date: activity.date.toISOString(),
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
    }, 201)
  } catch (e) {
    console.error('Discord webhook error:', e)
    return apiError('Internal server error', 500)
  }
}
