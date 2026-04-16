import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { recordAudit, getRequestIp } from '@/lib/audit'
import { notifyAllAdmins } from '@/lib/notify'
import { z } from 'zod'

const requestSchema = z.object({
  role: z.string().min(2).max(60),
  message: z.string().max(2000).optional(),
})

/** GET — list the current user's own role requests. */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)
    const items = await prisma.memberRoleRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(items)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}

/** POST — request a new role. Notifies all super admins. */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'Validation error', 422)

    // Block duplicate pending request for the same role
    const existing = await prisma.memberRoleRequest.findFirst({
      where: { userId: user.id, role: parsed.data.role, status: 'pending' },
    })
    if (existing) return apiError('You already have a pending request for this role', 409)

    const created = await prisma.memberRoleRequest.create({
      data: {
        userId: user.id,
        role: parsed.data.role,
        message: parsed.data.message ?? null,
      },
    })

    await Promise.all([
      recordAudit({
        userId: user.id,
        action: 'request',
        module: 'roles',
        entityType: 'MemberRoleRequest',
        entityId: created.id,
        details: `${user.displayName} requested role "${parsed.data.role}"`,
        after: { role: parsed.data.role, status: 'pending' },
        ipAddress: getRequestIp(request),
      }),
      notifyAllAdmins({
        title: 'New role request',
        message: `${user.displayName} requested the role "${parsed.data.role}".`,
        type: 'info',
        link: '/admin/role-requests',
      }),
    ])

    return apiSuccess(created, 201)
  } catch (e) {
    console.error('Role request create error:', e)
    return apiError('Internal server error', 500)
  }
}
