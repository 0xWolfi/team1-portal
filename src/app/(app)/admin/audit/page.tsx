'use client'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { Card } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/helpers'
import type { AuditLogEntry } from '@/types'

export default function AdminAuditPage() {
  const { data: result, loading } = useApi<{ items: AuditLogEntry[]; total: number }>('/api/admin/audit')

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-white flex items-center gap-2"><ScrollText size={24} className="text-red-500" /> Audit Log</h1>
        <p className="text-sm text-zinc-400 mt-1">{result?.total || 0} entries</p>
      </motion.div>

      {loading ? <PageLoader /> : result && result.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-700/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Date</th>
            </tr></thead>
            <tbody>
              {result.items.map((log) => (
                <tr key={log.id} className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-sm text-zinc-300">{log.user?.displayName || 'System'}</td>
                  <td className="px-4 py-3 text-sm text-white font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{log.module}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{log.details || '-'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : <EmptyState icon={<ScrollText size={40} />} title="No audit logs yet" />}
    </div>
  )
}
