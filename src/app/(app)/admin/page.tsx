'use client'
import { Users, Globe, ClipboardList, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useApi } from '@/hooks/use-api'
import Link from 'next/link'
import type { Region, MembershipApplication } from '@/types'

export default function AdminDashboardPage() {
  const { isSuperAdmin } = useAuth()
  const { data: regions } = useApi<Region[]>('/api/regions')
  const { data: appData } = useApi<{ items: MembershipApplication[]; total: number }>(isSuperAdmin ? '/api/applications?status=pending' : null)
  const { data: memberData } = useApi<{ total: number }>(isSuperAdmin ? '/api/admin/members?page=1' : null)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage the team1 portal</p>
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/members" className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Users size={20} className="text-zinc-200" /></div>
              <ArrowRight size={16} className="ml-auto text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-white">{memberData?.total || 0}</p>
            <p className="text-sm text-zinc-500">Total Members</p>
          </Link>
          <Link href="/admin/regions" className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Globe size={20} className="text-zinc-200" /></div>
              <ArrowRight size={16} className="ml-auto text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-white">{regions?.length || 0}</p>
            <p className="text-sm text-zinc-500">Regions</p>
          </Link>
          <Link href="/admin/applications" className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/5"><ClipboardList size={20} className="text-zinc-200" /></div>
              <ArrowRight size={16} className="ml-auto text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-white">{appData?.total || 0}</p>
            <p className="text-sm text-zinc-500">Pending Apps</p>
          </Link>
        </div>
      )}

      {/* Regions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Region Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions?.map((r) => (
            <Link key={r.id} href={`/admin/region/${r.slug}/members`} className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all">
              <h3 className="text-base font-bold text-white mb-1">{r.name}</h3>
              <p className="text-xs text-zinc-500">{r.country} · {r._count?.memberships || 0} members</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
