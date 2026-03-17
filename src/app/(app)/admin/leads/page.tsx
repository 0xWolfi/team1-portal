'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Plus, Trash2 } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageLoader } from '@/components/ui/spinner'

export default function AdminLeadsPage() {
  const { data: regions, loading, refetch } = useApi<any[]>('/api/admin/leads')
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [email, setEmail] = useState('')

  const handleAssign = async () => {
    if (!selectedRegion || !email) return
    const res = await mutate('/api/admin/leads', 'POST', { email, regionId: selectedRegion, role: 'lead' })
    if (res.success) { success('Lead assigned!'); setModal(false); setEmail(''); refetch() }
    else showError(res.error || 'Failed')
  }

  const handleRemove = async (membershipId: string) => {
    const res = await mutate(`/api/admin/leads/${membershipId}`, 'DELETE')
    if (res.success) { success('Lead removed'); refetch() }
    else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white flex items-center gap-2"><Shield size={24} className="text-red-500" /> Country Leads</h1>
          <p className="text-sm text-zinc-400 mt-1">Assign leads to manage their regions</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={16} /> Assign Lead</Button>
      </motion.div>

      {loading ? <PageLoader /> : (
        <div className="space-y-4">
          {regions?.map((region: any) => (
            <Card key={region.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-medium text-white">{region.name}</h3>
                  <p className="text-xs text-zinc-400">{region.country} &middot; {region._count?.memberships || 0} members</p>
                </div>
              </div>
              {region.memberships?.length > 0 ? (
                <div className="space-y-2">
                  {region.memberships.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-zinc-950 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar src={m.user.avatarUrl} name={m.user.displayName} size="sm" />
                        <div>
                          <p className="text-sm text-white">{m.user.displayName}</p>
                          <p className="text-xs text-zinc-400">{m.user.email}</p>
                        </div>
                        <Badge variant={m.role === 'lead' ? 'danger' : 'warning'}>{m.role === 'co_lead' ? 'Co-Lead' : 'Lead'}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)}><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No lead assigned</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Assign Country Lead">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm text-zinc-300 font-medium">Region</label>
            <select className="w-full h-11 px-4 bg-zinc-900 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-red-500" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="">Select region</option>
              {regions?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <Input label="User Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lead@example.com" />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleAssign}>Assign Lead</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
