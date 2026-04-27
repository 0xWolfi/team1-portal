'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Plus } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { PageLoader } from '@/components/ui/spinner'
import type { Region } from '@/types'

export default function AdminRegionsPage() {
  const { data: regions, loading, refetch } = useApi<Region[]>('/api/admin/regions')
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', description: '' })

  const handleCreate = async () => {
    const res = await mutate('/api/admin/regions', 'POST', form)
    if (res.success) {
      success('Region created!')
      setModal(false)
      setForm({ name: '', country: '', description: '' })
      refetch()
    } else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><Globe size={24} className="text-red-500" /> Regions</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{regions?.length || 0} regions</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={16} /> Add Region</Button>
      </motion.div>

      {loading ? <PageLoader /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions?.map((r: any) => (
            <Card key={r.id} hover>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{r.name}</h3>
                <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{r.country} &middot; {r._count?.memberships || 0} members</p>
              <p className="text-xs text-zinc-500 mt-1">/{r.slug}</p>
              {r.memberships?.filter((m: any) => m.role === 'lead').map((m: any) => (
                <p key={m.user.id} className="text-xs text-red-600 dark:text-red-500 mt-2">Lead: {m.user.displayName}</p>
              ))}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Region">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., India" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g., India" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Region</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
