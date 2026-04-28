import jwt, { type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import crypto from 'crypto'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET env var is required and must be at least 32 characters')
  }
  return secret
}
const JWT_SECRET: string = getJwtSecret()
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as string
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30')

export interface TokenPayload {
  userId: string
  email: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN } as SignOptions)
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as unknown as TokenPayload
  } catch {
    return null
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const refreshToken = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)

  // Limit sessions to 10
  const sessions = await prisma.authSession.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  if (sessions.length >= 10) {
    await prisma.authSession.delete({ where: { id: sessions[0].id } })
  }

  await prisma.authSession.create({
    data: { userId, refreshToken, expiresAt, ipAddress: ip, userAgent: ua },
  })

  return refreshToken
}

export async function getUserFromRequest(request: Request) {
  // Try Authorization header first (for API clients), then httpOnly cookie
  let token: string | null = null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/accessToken=([^;]+)/)
    token = match?.[1] || null
  }

  if (!token) return null

  const payload = verifyAccessToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
    include: {
      adminRole: true,
      memberships: {
        where: { status: 'accepted' },
        include: { region: true },
      },
    },
  })

  return user
}

/** Build Set-Cookie header value for the access token (httpOnly, 15 min). */
export function accessTokenCookie(token: string): string {
  return `accessToken=${token}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

/** Build Set-Cookie header to clear the access token cookie. */
export function clearAccessTokenCookie(): string {
  return `accessToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export function apiSuccess(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function apiError(error: string, status = 400) {
  return Response.json({ success: false, error }, { status })
}

type AdminLike = { adminRole?: { role: string } | null } | null | undefined

export function isSuperAdmin(user: AdminLike): boolean {
  return !!user?.adminRole && user.adminRole.role === 'super_admin'
}

export function isCommunityOps(user: AdminLike): boolean {
  return !!user?.adminRole && user.adminRole.role === 'community_ops'
}

export function isPlatformAdmin(user: AdminLike): boolean {
  return isSuperAdmin(user) || isCommunityOps(user)
}

export function parseRegionCountries(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    if (!Array.isArray(v)) return []
    return v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  } catch {
    return []
  }
}
