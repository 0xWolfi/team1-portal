'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { PageLoader } from '@/components/ui/spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireMember?: boolean
  allowRegionLead?: boolean
}

export function AuthGuard({ children, requireAdmin, requireMember, allowRegionLead }: AuthGuardProps) {
  const { user, loading, isSuperAdmin, isRegionLead, isMember } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (requireAdmin && !isSuperAdmin && !(allowRegionLead && isRegionLead())) {
      router.push('/dashboard')
      return
    }

    if (requireMember && !isMember && !isSuperAdmin) {
      router.push('/apply')
      return
    }
  }, [user, loading, pathname, requireAdmin, requireMember, allowRegionLead, isSuperAdmin, isRegionLead, isMember, router])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader />
  if (requireAdmin && !isSuperAdmin && !(allowRegionLead && isRegionLead())) return <PageLoader />

  return <>{children}</>
}
