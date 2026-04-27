'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { isProfileComplete } from '@/lib/helpers'

/**
 * Shows a persistent banner when the signed-in user is missing required
 * profile fields (displayName, country, discord, xHandle). Clicking it
 * deep-links to /profile/settings. Hides automatically once complete or
 * while the user is already on the profile settings page.
 */
export function ProfileCompletionBanner() {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  if (loading || !user) return null
  if (isProfileComplete(user)) return null
  if (pathname?.startsWith('/profile/settings')) return null

  return (
    <Link
      href="/profile/settings"
      className="group flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/15 transition-colors"
    >
      <div className="p-1.5 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-300 shrink-0">
        <AlertCircle size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Complete your profile</p>
        <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
          Please fill in the required fields (marked *) so others can connect with you.
        </p>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-amber-800 group-hover:text-amber-900 dark:text-amber-200 dark:group-hover:text-amber-100">
        Go to profile <ArrowRight size={14} />
      </span>
    </Link>
  )
}
