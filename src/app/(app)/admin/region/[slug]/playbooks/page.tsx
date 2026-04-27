'use client'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Edit, Trash2 } from 'lucide-react'
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
import type { Playbook } from '@/types'

const defaultForm = { title: '', description: '', content: '', visibility: 'member', status: 'draft' }

export default function RegionPlaybooksAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: playbooks, loading, refetch } = useApi<Playbook[]>(`/api/playbooks/${slug}`)
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const handleSave = async () => {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    const res = await mutate(`/api/playbooks/${slug}`, method, body)
    if (res.success) {
      success(editId ? 'Updated!' : 'Created!')
      setModal(false); setEditId(null); setForm(defaultForm); refetch()
    } else showError(res.error || 'Failed')
  }

  const handleEdit = (p: Playbook) => {
    setEditId(p.id)
    setForm({ title: p.title, description: p.description || '', content: p.content || '', visibility: p.visibility, status: p.status })
    setModal(true)
  }

  const handleDelete = async (id: string) => {
    const res = await mutate(`/api/playbooks/${slug}?id=${id}`, 'DELETE')
    if (res.success) { success('Deleted'); refetch() }
    else showError(res.error || 'Failed')
  }

  // Also fetch all including drafts for admin
  const { data: allPlaybooks } = useApi<Playbook[]>(`/api/playbooks/${slug}`)

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><BookOpen size={24} className="text-red-500" /> Playbooks</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Manage playbooks for {slug}</p></div>
        <Button onClick={() => { setEditId(null); setForm(defaultForm); setModal(true) }}><Plus size={16} /> New Playbook</Button>
      </motion.div>

      {loading ? <PageLoader /> : playbooks && playbooks.length > 0 ? (
        <div className="space-y-3">
          {playbooks.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{p.title}</h3>
                  <Badge variant={p.status === 'published' ? 'success' : 'warning'}>{p.status}</Badge>
                  <Badge>{p.visibility}</Badge>
                </div>
                {p.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">{p.description}</p>}
                <p className="text-[10px] text-zinc-500 mt-1">{formatDate(p.createdAt)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} className="text-red-600 dark:text-red-400" /></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState icon={<BookOpen size={40} />} title="No playbooks" action={<Button onClick={() => setModal(true)}><Plus size={16} /> Create Playbook</Button>} />}

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null) }} title={editId ? 'Edit Playbook' : 'New Playbook'} size="lg">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Content (Markdown)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[200px] font-mono text-xs" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Visibility</label>
              <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                <option value="member">Member Only</option><option value="public">Public</option>
              </select>
            </div>
            <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Status</label>
              <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option><option value="published">Published</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
