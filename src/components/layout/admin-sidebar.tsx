'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Globe, Shield, ClipboardList, Megaphone, ScrollText, BookOpen, Briefcase, FileText, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/helpers'
import { useState } from 'react'
import type { Region } from '@/types'

const superAdminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'All Members', href: '/admin/members', icon: Users },
  { label: 'Regions', href: '/admin/regions', icon: Globe },
  { label: 'Country Leads', href: '/admin/leads', icon: Shield },
  { label: 'Applications', href: '/admin/applications', icon: ClipboardList },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
]

const communityOpsNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'All Members', href: '/admin/members', icon: Users },
  { label: 'Applications', href: '/admin/applications', icon: ClipboardList },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
]

const regionNav = [
  { label: 'Overview', href: '', icon: LayoutDashboard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Playbooks', href: '/playbooks', icon: BookOpen },
  { label: 'Programs', href: '/programs', icon: Briefcase },
  { label: 'Guides', href: '/guides', icon: FileText },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
]

export function AdminSidebar() {
  const { isSuperAdmin, isCommunityOps, isPlatformAdmin, getUserRegions } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)

  const userRegions = getUserRegions().filter((r) => r.role === 'lead' || r.role === 'co_lead')
  const { data: allRegions } = useApi<Region[]>(isPlatformAdmin ? '/api/regions' : null)
  const regions = isPlatformAdmin ? (allRegions || []) : userRegions.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))

  return (
    <aside className="w-[260px] shrink-0 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
      <div className="flex-1 p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-zinc-900 dark:text-white font-medium text-base">team1</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-500 dark:border-red-500/25 rounded-md">ADMIN</span>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Exit Admin">
            <ArrowLeft size={16} />
          </button>
        </div>

        {/* Super Admin / Community Ops nav */}
        {(isSuperAdmin || isCommunityOps) && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3 px-3">{isSuperAdmin ? 'Super Admin' : 'Community Ops'}</p>
            <nav className="space-y-1">
              {(isSuperAdmin ? superAdminNav : communityOpsNav).map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
                      isActive
                        ? 'text-red-700 bg-red-50 border border-red-200 dark:text-red-500 dark:bg-red-500/10 dark:border-transparent font-medium'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}

        {/* Region admin sections */}
        {regions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3 px-3">Regions</p>
            <div className="space-y-1">
              {regions.map((region) => {
                const isExpanded = expandedRegion === region.slug || pathname.includes(`/admin/region/${region.slug}`)
                return (
                  <div key={region.slug}>
                    <button
                      onClick={() => setExpandedRegion(isExpanded ? null : region.slug)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-all',
                        isExpanded ? 'text-zinc-900 bg-zinc-100 dark:text-white dark:bg-zinc-800 font-medium' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Globe size={14} />
                        {region.name}
                      </span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {isExpanded && (
                      <div className="ml-5 mt-1 space-y-0.5 border-l border-zinc-200 dark:border-zinc-700/50 pl-3">
                        {regionNav.map((item) => {
                          const href = `/admin/region/${region.slug}${item.href}`
                          const Icon = item.icon
                          const isActive = pathname === href
                          return (
                            <Link
                              key={href}
                              href={href}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all',
                                isActive
                                  ? 'text-red-700 bg-red-50 border border-red-200 dark:text-red-500 dark:bg-red-500/10 dark:border-transparent font-medium'
                                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800'
                              )}
                            >
                              <Icon size={14} />
                              {item.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
