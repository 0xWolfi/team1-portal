'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { api } from '@/lib/api-client'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isSuperAdmin: boolean
  isRegionLead: (regionSlug?: string) => boolean
  isMember: boolean
  getUserRegions: () => Array<{ id: string; name: string; slug: string; role: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  const refreshUser = useCallback(async () => {
    // Check for NextAuth session token first
    if (session && (session as any).accessToken) {
      const token = (session as any).accessToken as string
      if (!api.getToken()) {
        api.setToken(token)
      }
    }

    const token = api.getToken()
    if (!token) { setUser(null); setLoading(false); return }
    const res = await api.get<AuthUser>('/api/auth/me')
    if (res.success && res.data) setUser(res.data)
    else { setUser(null); api.setToken(null) }
    setLoading(false)
  }, [session])

  useEffect(() => {
    if (status !== 'loading') {
      refreshUser()
    }
  }, [refreshUser, status])

  const logout = async () => {
    await api.post('/api/auth/logout')
    api.setToken(null)
    setUser(null)
    await nextAuthSignOut({ callbackUrl: '/login' })
  }

  const isSuperAdmin = !!user?.adminRole && user.adminRole.role === 'super_admin'

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
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, isSuperAdmin, isRegionLead, isMember, getUserRegions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
