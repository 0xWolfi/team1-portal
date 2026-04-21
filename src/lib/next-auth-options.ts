import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
// Token generation is now handled by /api/auth/init (httpOnly cookies)
import '@/lib/auth' // ensure JWT_SECRET validation runs at startup

// Fail-closed: require NEXTAUTH_SECRET to be set
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
if (!NEXTAUTH_SECRET || NEXTAUTH_SECRET.length < 32) {
  throw new Error('NEXTAUTH_SECRET env var is required and must be at least 32 characters')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const email = user.email.toLowerCase().trim()

      // Check if user already exists in DB (existing member or admin)
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) return true

      // Auto-whitelist all @team1.network emails — create as pending, require admin approval
      if (email.endsWith('@team1.network')) {
        const newUser = await prisma.user.create({
          data: {
            email,
            displayName: user.name || email.split('@')[0],
            avatarUrl: user.image || null,
            emailVerified: true,
          },
        })
        const globalRegion = await prisma.region.findUnique({ where: { slug: 'global' } })
        if (globalRegion) {
          await prisma.userRegionMembership.create({
            data: {
              userId: newUser.id,
              regionId: globalRegion.id,
              role: 'member',
              status: 'pending',
              isPrimary: true,
            },
          })
        }
        return true
      }

      // Check if email is in the roster whitelist
      const rosterEntry = await prisma.memberRoster.findUnique({ where: { email } })
      if (rosterEntry) {
        // Create user from roster entry
        await prisma.user.create({
          data: {
            email,
            displayName: rosterEntry.name || user.name || email.split('@')[0],
            avatarUrl: user.image || null,
            emailVerified: true,
          },
        })
        // Mark roster entry as used
        await prisma.memberRoster.update({
          where: { id: rosterEntry.id },
          data: { isUsed: true },
        })
        return true
      }

      // Not in roster — deny login (generic error to prevent account enumeration)
      return false
    },
    async jwt({ token, account, user }) {
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase().trim() },
        })
        if (dbUser) {
          token.userId = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (token.userId) {
        session.userId = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: NEXTAUTH_SECRET,
}
