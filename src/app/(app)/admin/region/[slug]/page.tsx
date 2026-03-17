'use client'
import { use } from 'react'
import { motion } from 'framer-motion'
import { Users, BookOpen, Briefcase, FileText, Megaphone } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import type { Region, Playbook, Program, Guide } from '@/types'

function StatCard({ icon, label, value, href, delay }: { icon: React.ReactNode; label: string; value: number; href: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={href}><Card hover className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">{icon}</div>
        <div><p className="text-2xl font-medium text-white">{value}</p><p className="text-xs text-zinc-400">{label}</p></div>
      </Card></Link>
    </motion.div>
  )
}

export default function RegionAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: region } = useApi<Region & { _count: { memberships: number } }>(`/api/regions/${slug}`)
  const { data: playbooks } = useApi<Playbook[]>(`/api/playbooks?region=${slug}`)
  const { data: programs } = useApi<Program[]>(`/api/programs?region=${slug}`)
  const { data: guides } = useApi<Guide[]>(`/api/guides?region=${slug}`)

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-white">{region?.name || slug} <span className="text-red-500">Admin</span></h1>
        <p className="text-sm text-zinc-400 mt-1">Manage content for {region?.name}</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Members" value={region?._count?.memberships || 0} href={`/admin/region/${slug}/members`} delay={0.08} />
        <StatCard icon={<BookOpen size={20} />} label="Playbooks" value={playbooks?.length || 0} href={`/admin/region/${slug}/playbooks`} delay={0.16} />
        <StatCard icon={<Briefcase size={20} />} label="Programs" value={programs?.length || 0} href={`/admin/region/${slug}/programs`} delay={0.24} />
        <StatCard icon={<FileText size={20} />} label="Guides" value={guides?.length || 0} href={`/admin/region/${slug}/guides`} delay={0.32} />
      </div>
    </div>
  )
}
