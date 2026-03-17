import jwt, { type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as string
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30')

export interface TokenPayload {
  userId: string
  email: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions)
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
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
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
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

export function apiSuccess(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function apiError(error: string, status = 400) {
  return Response.json({ success: false, error }, { status })
}
