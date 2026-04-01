import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { z } from 'zod'

const activitySchema = z.object({
  type: z.enum(['organized_event', 'attended_event', 'submitted_pr', 'created_content', 'other']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  date: z.string().min(1, 'Date is required'),
  link: z.string().url().optional().or(z.literal('')),
})

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    const activities = await prisma.memberActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 50,
    })

    return apiSuccess(activities.map((a) => ({
      ...a,
      date: a.date.toISOString(),
      createdAt: a.createdAt.toISOString(),
    })))
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

    const activity = await prisma.memberActivity.create({
      data: {
        userId: user.id,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        date: new Date(parsed.data.date),
        link: parsed.data.link || null,
      },
    })

    return apiSuccess({
      ...activity,
      date: activity.date.toISOString(),
      createdAt: activity.createdAt.toISOString(),
    })
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
    if (activity.userId !== user.id) return apiError('Forbidden', 403)

    await prisma.memberActivity.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e: any) {
    return apiError(e.message || 'Server error', 500)
  }
}
