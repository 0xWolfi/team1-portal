'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollText, ChevronDown, ChevronRight } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { Card } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/helpers'
import type { AuditLogEntry } from '@/types'

const MODULES = ['', 'profile', 'members', 'roles', 'activities', 'leads', 'regions', 'announcements', 'applications', 'playbooks']

export default function AdminAuditPage() {
  const [moduleFilter, setModuleFilter] = useState('')
  const [memberId, setMemberId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const qs = new URLSearchParams()
  if (moduleFilter) qs.set('module', moduleFilter)
  if (memberId.trim()) qs.set('memberId', memberId.trim())

  const { data: result, loading } = useApi<{ items: AuditLogEntry[]; total: number }>(
    `/api/admin/audit${qs.toString() ? `?${qs.toString()}` : ''}`,
    [moduleFilter, memberId],
  )

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><ScrollText size={24} className="text-red-500" /> Audit Log</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{result?.total || 0} entries</p>
      </motion.div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="h-10 px-3 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500"
        >
          {MODULES.map((m) => <option key={m} value={m}>{m || 'All modules'}</option>)}
        </select>
        <input
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Filter by member id (entity or actor)"
          className="h-10 px-3 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-red-500 min-w-[260px]"
        />
      </div>

      {loading ? <PageLoader /> : result && result.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-200 dark:border-zinc-700/50">
              <th className="w-8" />
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">Date</th>
            </tr></thead>
            <tbody>
              {result.items.map((log) => {
                const expanded = expandedId === log.id
                const hasDiff = !!log.previousValue || !!log.newValue
                return (
                  <>
                    <tr
                      key={log.id}
                      className={`border-b border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${hasDiff ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDiff && setExpandedId(expanded ? null : log.id)}
                    >
                      <td className="pl-3 text-zinc-500">{hasDiff ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{log.user?.displayName || 'System'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-900 dark:text-white font-mono">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{log.module}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{log.entityType ? `${log.entityType}/${(log.entityId || '').slice(0, 8)}` : '-'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[260px] truncate">{log.details || '-'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(log.createdAt)}</td>
                    </tr>
                    <AnimatePresence>
                      {expanded && hasDiff && (
                        <tr key={`${log.id}-diff`} className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-950/40">
                          <td colSpan={7} className="px-4 py-3">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-2 gap-4 overflow-hidden"
                            >
                              <DiffBlock label="Previous" json={log.previousValue} tone="red" />
                              <DiffBlock label="New" json={log.newValue} tone="emerald" />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                )
              })}
            </tbody>
          </table>
        </Card>
      ) : <EmptyState icon={<ScrollText size={40} />} title="No audit logs yet" />}
    </div>
  )
}

function DiffBlock({ label, json, tone }: { label: string; json: string | null; tone: 'red' | 'emerald' }) {
  let pretty: string = json || '∅'
  try {
    if (json) pretty = JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    /* keep raw */
  }
  const toneCls = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200'
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <p className="text-[10px] uppercase tracking-wider mb-1.5 opacity-70">{label}</p>
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">{pretty}</pre>
    </div>
  )
}
