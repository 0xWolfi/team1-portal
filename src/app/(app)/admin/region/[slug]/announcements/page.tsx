'use client'
import { use, useState } from 'react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/helpers'
import type { Announcement, Region } from '@/types'

export default function RegionAnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: announcements, refetch } = useApi<Announcement[]>(`/api/announcements?region=${slug}`)
  const { data: region } = useApi<Region>(`/api/regions/${slug}`)
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' })

  const handleCreate = async () => {
    if (!region) return
    const res = await mutate('/api/announcements', 'POST', { ...form, regionId: region.id, isGlobal: false })
    if (res.success) { success('Created!'); setModal(false); setForm({ title: '', content: '', priority: 'normal' }); refetch() }
    else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><Megaphone size={24} className="text-red-500" /> Announcements</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{slug} region announcements</p></div>
        <Button onClick={() => setModal(true)}><Plus size={16} /> New</Button>
      </motion.div>

      {announcements && announcements.length > 0 ? (
        <div className="space-y-3">{announcements.filter(a => !a.isGlobal).map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{a.title}</h3>
              {a.priority !== 'normal' && <Badge variant={a.priority === 'urgent' ? 'danger' : 'warning'}>{a.priority}</Badge>}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{a.content}</p>
            <p className="text-[10px] text-zinc-500 mt-2">{formatDate(a.createdAt)}</p>
          </Card>
        ))}</div>
      ) : <EmptyState icon={<Megaphone size={40} />} title="No announcements" />}

      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Priority</label>
            <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button onClick={handleCreate}>Create</Button></div>
        </div>
      </Modal>
    </div>
  )
}
