'use client'
import { useAuth } from '@/context/auth-context'
import { useApi } from '@/hooks/use-api'
import { Users, Globe, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Region } from '@/types'
import { AddActivityButton } from '@/components/dashboard/add-activity-button'

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const { data: regions } = useApi<Region[]>('/api/regions')
  const regionCount = user?.memberships?.length || 0

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Welcome back, <span className="text-brand-500">{user?.displayName?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">team1 Member Portal</p>
        </div>
        <AddActivityButton onCreated={() => refreshUser()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 rounded-lg">
              <Globe size={20} className="text-zinc-700 dark:text-zinc-200" />
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Your Regions</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{regionCount}</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 rounded-lg">
              <Users size={20} className="text-zinc-700 dark:text-zinc-200" />
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Regions</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{regions?.length || 0}</p>
        </div>
        <Link href="/directory" className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:border-white/5 dark:hover:border-white/20 dark:hover:bg-white/5 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 rounded-lg">
              <Users size={20} className="text-zinc-700 dark:text-zinc-200" />
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Member Directory</span>
            <ArrowRight size={16} className="ml-auto text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-white transition-colors" />
          </div>
          <p className="text-sm text-zinc-600 group-hover:text-zinc-800 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors">Browse & connect with community members</p>
        </Link>
      </div>

      {/* Your Regions */}
      {user?.memberships && user.memberships.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 rounded-lg">
              <Globe size={18} className="text-zinc-700 dark:text-zinc-200" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Your Regions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.memberships.map((m) => (
              <div key={m.id} className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900/50 dark:border-white/5 dark:hover:border-white/20 transition-all">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">{m.region.name}</h3>
                <p className="text-xs text-zinc-500">{m.region.country}</p>
                <span className="inline-block mt-3 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400/80 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-2 py-0.5 rounded-full capitalize">
                  {m.role.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
