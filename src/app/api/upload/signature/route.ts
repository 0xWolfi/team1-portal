import crypto from 'crypto'
import { getUserFromRequest, apiError, apiSuccess } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return apiError('Unauthorized', 401)

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return apiError('Cloudinary not configured', 500)
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `portal-avatars/${user.id}`

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  return apiSuccess({ signature, timestamp, apiKey, cloudName, folder })
}
