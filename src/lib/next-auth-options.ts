import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { generateAccessToken, createSession } from '@/lib/auth'

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

      // Auto-whitelist all @team1.network emails
      if (email.endsWith('@team1.network')) {
        await prisma.user.create({
          data: {
            email,
            displayName: user.name || email.split('@')[0],
            avatarUrl: user.image || null,
            emailVerified: true,
          },
        })
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

      // Not in roster — deny login
      return '/login?error=not_in_roster'
    },
    async jwt({ token, account, user }) {
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase().trim() },
        })

        if (dbUser) {
          const accessToken = generateAccessToken({ userId: dbUser.id, email: dbUser.email })
          const refreshToken = await createSession(dbUser.id)
          token.accessToken = accessToken
          token.refreshToken = refreshToken
          token.userId = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (token.accessToken) {
        session.accessToken = token.accessToken
        session.userId = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
