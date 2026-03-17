import { prisma } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return apiError('Email is required', 422)

    const app = await prisma.membershipApplication.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, fullName: true, email: true, status: true, createdAt: true, reviewNote: true },
    })

    if (!app) return apiError('No application found for this email', 404)
    return apiSuccess(app)
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
