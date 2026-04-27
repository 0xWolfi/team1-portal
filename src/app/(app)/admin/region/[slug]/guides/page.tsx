'use client'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Edit, Trash2 } from 'lucide-react'
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
import type { Guide } from '@/types'

const defaultForm = { title: '', category: '', content: '', readTime: '', visibility: 'member', status: 'draft' }

export default function RegionGuidesAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: guides, loading, refetch } = useApi<Guide[]>(`/api/guides/${slug}`)
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const handleSave = async () => {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId, readTime: form.readTime ? parseInt(form.readTime) : undefined } : { ...form, readTime: form.readTime ? parseInt(form.readTime) : undefined }
    const res = await mutate(`/api/guides/${slug}`, method, body)
    if (res.success) { success(editId ? 'Updated!' : 'Created!'); setModal(false); setEditId(null); setForm(defaultForm); refetch() }
    else showError(res.error || 'Failed')
  }

  const handleEdit = (g: Guide) => {
    setEditId(g.id)
    setForm({ title: g.title, category: g.category || '', content: g.content || '', readTime: g.readTime?.toString() || '', visibility: g.visibility, status: g.status })
    setModal(true)
  }

  const handleDelete = async (id: string) => {
    const res = await mutate(`/api/guides/${slug}?id=${id}`, 'DELETE')
    if (res.success) { success('Deleted'); refetch() } else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><FileText size={24} className="text-red-500" /> Guides</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Manage guides for {slug}</p></div>
        <Button onClick={() => { setEditId(null); setForm(defaultForm); setModal(true) }}><Plus size={16} /> New Guide</Button>
      </motion.div>

      {loading ? <PageLoader /> : guides && guides.length > 0 ? (
        <div className="space-y-3">{guides.map((g) => (
          <Card key={g.id} className="flex items-center justify-between">
            <div className="flex-1"><div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{g.title}</h3>
              <Badge variant={g.status === 'published' ? 'success' : 'warning'}>{g.status}</Badge>
              {g.category && <Badge>{g.category}</Badge>}
            </div></div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(g)}><Edit size={14} /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}><Trash2 size={14} className="text-red-600 dark:text-red-400" /></Button>
            </div>
          </Card>
        ))}</div>
      ) : <EmptyState icon={<FileText size={40} />} title="No guides" action={<Button onClick={() => setModal(true)}><Plus size={16} /> Create</Button>} />}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Guide' : 'New Guide'} size="lg">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Getting Started" />
            <Input label="Read Time (min)" type="number" value={form.readTime} onChange={(e) => setForm({ ...form, readTime: e.target.value })} />
          </div>
          <Textarea label="Content (Markdown)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[200px] font-mono text-xs" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Visibility</label>
              <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                <option value="member">Member Only</option><option value="public">Public</option></select></div>
            <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Status</label>
              <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option><option value="published">Published</option></select></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
