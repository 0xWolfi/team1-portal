'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Shield, ClipboardList, Globe, ScrollText, LogOut, ChevronDown, ChevronRight, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/helpers'
import { ThemeToggle } from './theme-toggle'

const MEMBER_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, exact: true },
  { label: 'Directory', href: '/directory', icon: Users },
]

const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: Home, exact: true },
  { label: 'All Members', href: '/admin/members', icon: Users },
  { label: 'Regions', href: '/admin/regions', icon: Globe },
  { label: 'Country Leads', href: '/admin/leads', icon: Shield },
  { label: 'Applications', href: '/admin/applications', icon: ClipboardList },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
]

const LEAD_ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: Home, exact: true },
  { label: 'Applications', href: '/admin/applications', icon: ClipboardList },
]

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const { user, logout, isSuperAdmin, isRegionLead, getUserRegions } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)

  const regions = getUserRegions()
  const navItems = isAdmin
    ? (isSuperAdmin ? SUPER_ADMIN_NAV : LEAD_ADMIN_NAV)
    : MEMBER_NAV

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-200 dark:border-white/[0.06] shrink-0">
        <img src="/logos/Team1_Symbol_Black.svg" alt="team1" className="h-6 w-6 block dark:hidden" />
        <img src="/logos/Team1_Symbol_Main.svg" alt="team1" className="h-6 w-6 hidden dark:block" />
        <span className="text-zinc-900 dark:text-white font-medium">team1 <span className="text-brand-500">portal</span></span>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-mono text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-500/20">
            admin
          </span>
        )}
        {!isAdmin && (
          <span className="ml-auto text-[10px] font-mono text-emerald-700 dark:text-emerald-400/80 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            member
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group',
                active
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-white/[0.08] dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]'
              )}
            >
              <Icon size={18} className={cn('transition-colors', active ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-600 dark:group-hover:text-zinc-400')} />
              <span>{item.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />}
            </Link>
          )
        })}

        {/* Admin: Region sub-navs */}
        {isAdmin && regions.length > 0 && (
          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-white/[0.06]">
            <p className="px-3 mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">{isSuperAdmin ? 'Regions' : 'Your Regions'}</p>
            {(isSuperAdmin ? regions : regions.filter(r => r.role === 'lead' || r.role === 'co_lead')).map((r) => {
              const expanded = expandedRegion === r.slug || pathname.includes(`/admin/region/${r.slug}`)
              return (
                <div key={r.slug}>
                  <button
                    onClick={() => setExpandedRegion(expanded ? null : r.slug)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-xl text-[13px] transition-all',
                      expanded ? 'text-zinc-900 bg-zinc-100 dark:text-white dark:bg-white/[0.06]' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="flex items-center gap-2"><Globe size={14} />{r.name}</span>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {expanded && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-zinc-200 dark:border-white/[0.06] pl-3">
                      {[
                        { label: 'Members', href: `/admin/region/${r.slug}/members` },
                      ].map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            'block px-3 py-1.5 rounded-lg text-xs transition-all',
                            pathname === sub.href ? 'text-zinc-900 bg-zinc-100 dark:text-white dark:bg-white/[0.06]' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-600 dark:hover:text-zinc-300'
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Member: Switch to admin */}
        {!isAdmin && (isSuperAdmin || isRegionLead()) && (
          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-white/[0.06]">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-brand-600 hover:bg-brand-50 dark:text-zinc-500 dark:hover:text-brand-400 dark:hover:bg-brand-500/[0.06] transition-all"
            >
              <Shield size={18} className="text-zinc-500 dark:text-zinc-600" />
              Admin Panel
            </Link>
          </div>
        )}

        {/* Admin: Back to portal */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-white/[0.06]">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04] transition-all"
            >
              <Home size={18} className="text-zinc-500 dark:text-zinc-600" />
              Member Portal
            </Link>
          </div>
        )}
      </nav>

      {/* Profile & Logout */}
      <div className="px-3 py-3 border-t border-zinc-200 dark:border-white/[0.06] space-y-0.5 shrink-0">
        <Link
          href="/profile/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/[0.04]"
        >
          <div className="w-7 h-7 rounded-full bg-brand-500/15 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-zinc-800 dark:text-zinc-300">{user?.displayName || 'Profile'}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-600 truncate">{user?.email}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-500/[0.06] transition-all duration-200 cursor-pointer"
          >
            <LogOut size={18} />
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[260px] z-40 flex-col bg-white/80 dark:bg-black/50 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/[0.06]">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 px-4 py-3 bg-white/80 dark:bg-black/40 backdrop-blur-2xl border-b border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
          <img src="/logos/Team1_Symbol_Black.svg" alt="team1" className="h-5 w-5 block dark:hidden" />
          <img src="/logos/Team1_Symbol_Main.svg" alt="team1" className="h-5 w-5 hidden dark:block" />
          <span className="text-zinc-900 dark:text-white text-sm font-medium">team1</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-brand-500/15 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/[0.06]">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
