'use client'
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { api } from '@/lib/api-client'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isSuperAdmin: boolean
  isCommunityOps: boolean
  isPlatformAdmin: boolean
  isRegionLead: (regionSlug?: string) => boolean
  isMember: boolean
  getUserRegions: () => Array<{ id: string; name: string; slug: string; role: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()
  const initCalledRef = useRef(false)

  const refreshUser = useCallback(async () => {
    // If we have a NextAuth session but haven't initialized httpOnly cookies yet, do so
    if (session && (session as any).userId && !initCalledRef.current) {
      initCalledRef.current = true
      await fetch('/api/auth/init', { method: 'POST', credentials: 'include' })
    }

    // Fetch user profile — cookies are sent automatically
    const res = await api.get<AuthUser>('/api/auth/me')
    if (res.success && res.data) {
      setUser(res.data)
    } else {
      setUser(null)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    if (status !== 'loading') {
      refreshUser()
    }
  }, [refreshUser, status])

  const logout = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
    initCalledRef.current = false
    await nextAuthSignOut({ callbackUrl: '/login' })
  }

  const isSuperAdmin = !!user?.adminRole && user.adminRole.role === 'super_admin'
  const isCommunityOps = !!user?.adminRole && user.adminRole.role === 'community_ops'
  const isPlatformAdmin = isSuperAdmin || isCommunityOps

  const isRegionLead = (regionSlug?: string) => {
    if (!user?.memberships) return false
    if (regionSlug) {
      return user.memberships.some(
        (m) => m.region.slug === regionSlug && (m.role === 'lead' || m.role === 'co_lead')
      )
    }
    return user.memberships.some((m) => m.role === 'lead' || m.role === 'co_lead')
  }

  const isMember = !!user?.memberships && user.memberships.length > 0

  const getUserRegions = () => {
    if (!user?.memberships) return []
    return user.memberships.map((m) => ({
      id: m.region.id,
      name: m.region.name,
      slug: m.region.slug,
      role: m.role,
    }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, isSuperAdmin, isCommunityOps, isPlatformAdmin, isRegionLead, isMember, getUserRegions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
