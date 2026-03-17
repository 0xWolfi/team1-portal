'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (data: { email: string; password: string; confirmPassword: string; displayName: string }) => Promise<{ success: boolean; error?: string }>
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

  const refreshUser = useCallback(async () => {
    const token = api.getToken()
    if (!token) { setUser(null); setLoading(false); return }
    const res = await api.get<AuthUser>('/api/auth/me')
    if (res.success && res.data) setUser(res.data)
    else { setUser(null); api.setToken(null) }
    setLoading(false)
  }, [])

  useEffect(() => { refreshUser() }, [refreshUser])

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>('/api/auth/login', { email, password })
    if (res.success && res.data) {
      api.setToken(res.data.accessToken)
      setUser(res.data.user)
      return { success: true }
    }
    return { success: false, error: res.error || 'Login failed' }
  }

  const signup = async (data: { email: string; password: string; confirmPassword: string; displayName: string }) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>('/api/auth/signup', data)
    if (res.success && res.data) {
      api.setToken(res.data.accessToken)
      setUser(res.data.user)
      return { success: true }
    }
    return { success: false, error: res.error || 'Signup failed' }
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    api.setToken(null)
    setUser(null)
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
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, isSuperAdmin, isRegionLead, isMember, getUserRegions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
