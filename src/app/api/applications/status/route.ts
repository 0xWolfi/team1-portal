import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return apiError('Email is required', 422)

    // Only allow users to check their own application status, or admins/leads to check any
    const normalizedEmail = email.toLowerCase().trim()
    const isOwnEmail = user.email.toLowerCase() === normalizedEmail

    if (!isOwnEmail) {
      const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
      const isLead = await prisma.userRegionMembership.findFirst({
        where: { userId: user.id, role: { in: ['lead', 'co_lead'] } },
      })
      if (!admin && !isLead) return apiError('Forbidden', 403)
    }

    const app = await prisma.membershipApplication.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true, createdAt: true },
    })

    if (!app) return apiError('No application found for this email', 404)
    return apiSuccess(app)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
