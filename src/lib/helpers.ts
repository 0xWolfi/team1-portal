import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Required profile fields — must all be filled for a profile to be considered complete.
// Keep in sync with the fields marked with `*` in profile/settings/page.tsx.
export const REQUIRED_PROFILE_FIELDS = ['displayName', 'country', 'discord', 'xHandle'] as const

export function isProfileComplete(u: {
  displayName?: string | null
  country?: string | null
  discord?: string | null
  xHandle?: string | null
} | null | undefined): boolean {
  if (!u) return false
  return REQUIRED_PROFILE_FIELDS.every((f) => {
    const v = u[f as keyof typeof u]
    return typeof v === 'string' && v.trim().length > 0
  })
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'lead': return 'bg-red-500/15 text-red-400 border-red-500/20'
    case 'co_lead': return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    case 'member': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

export function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'accepted': case 'approved': case 'published': case 'active':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    case 'pending': case 'draft':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    case 'rejected':
      return 'bg-red-500/15 text-red-400 border-red-500/20'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  }
}

export function formatRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin'
    case 'community_ops': return 'Community Ops'
    case 'co_lead': return 'Co-Lead'
    case 'lead': return 'Lead'
    case 'member': return 'Member'
    default: return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-500/15 text-red-400'
    case 'high': return 'bg-amber-500/15 text-amber-400'
    default: return 'bg-blue-500/15 text-blue-400'
  }
}
