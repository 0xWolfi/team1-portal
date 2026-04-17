import { apiSuccess, apiError } from '@/lib/auth'
import { sendSupportMail } from '@/lib/mailer'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  role: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  message: z.string().min(5, 'Please describe your issue').max(2000),
})

/**
 * POST /api/support
 * Public endpoint (no auth required) — sends a support email.
 * Rate-limited implicitly by SMTP; add explicit rate-limiting in production.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Validation error', 422)
    }

    const ok = await sendSupportMail(parsed.data)
    if (!ok) return apiError('Failed to send. Please email sarnavo@team1.network directly.', 500)

    return apiSuccess({ sent: true })
  } catch (e) {
    console.error('Support email error:', e)
    return apiError('Internal server error', 500)
  }
}
