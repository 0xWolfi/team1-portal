'use client'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { ProfileCompletionBanner } from '@/components/layout/profile-completion-banner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <AuthGuard requireAdmin={isAdmin} allowRegionLead={isAdmin}>
      <div className="min-h-[100svh] text-zinc-900 dark:text-white relative font-sans selection:bg-zinc-900/15 dark:selection:bg-white/20">
        {/* Background gradient */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-zinc-100/80 via-zinc-50/40 to-transparent dark:from-black/80 dark:via-black/50 dark:to-transparent pointer-events-none z-0" />

        {/* Sidebar */}
        <Sidebar isAdmin={isAdmin} />

        {/* Main Content */}
        <div className="lg:pl-[260px] flex flex-col min-h-[100svh]">
          <main className="flex-1 relative z-10 px-5 md:px-8 lg:px-10 py-6 lg:py-8">
            <ProfileCompletionBanner />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
