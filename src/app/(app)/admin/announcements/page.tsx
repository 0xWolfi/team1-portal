'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { PageLoader } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/helpers'
import type { Announcement, Region } from '@/types'

export default function AdminAnnouncementsPage() {
  const { data: announcements, loading, refetch } = useApi<Announcement[]>('/api/admin/announcements')
  const { data: regions } = useApi<Region[]>('/api/regions')
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', isGlobal: true, regionId: '' })

  const handleCreate = async () => {
    const res = await mutate('/api/announcements', 'POST', { ...form, isGlobal: !form.regionId, regionId: form.regionId || undefined })
    if (res.success) { success('Announcement created!'); setModal(false); setForm({ title: '', content: '', priority: 'normal', isGlobal: true, regionId: '' }); refetch() }
    else showError(res.error || 'Failed')
  }

  const handleDelete = async (id: string) => {
    const res = await mutate(`/api/admin/announcements/${id}`, 'DELETE')
    if (res.success) { success('Deleted'); refetch() }
    else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-medium text-white flex items-center gap-2"><Megaphone size={24} className="text-red-500" /> Announcements</h1></div>
        <Button onClick={() => setModal(true)}><Plus size={16} /> New Announcement</Button>
      </motion.div>

      {loading ? <PageLoader /> : announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-white">{a.title}</h3>
                  {a.isGlobal ? <Badge>Global</Badge> : a.region && <Badge variant="info">{a.region.name}</Badge>}
                  {a.priority !== 'normal' && <Badge variant={a.priority === 'urgent' ? 'danger' : 'warning'}>{a.priority}</Badge>}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{formatDate(a.createdAt)} &middot; {a.creator?.displayName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 size={14} className="text-red-400" /></Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState icon={<Megaphone size={40} />} title="No announcements yet" />}

      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-300 font-medium">Priority</label>
              <select className="w-full h-11 px-4 bg-zinc-900 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-red-500" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-300 font-medium">Region (or Global)</label>
              <select className="w-full h-11 px-4 bg-zinc-900 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-red-500" value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })}>
                <option value="">Global</option>
                {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
