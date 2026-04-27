'use client'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Edit, Trash2 } from 'lucide-react'
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
import { formatDate, getStatusBadgeColor } from '@/lib/helpers'
import type { Program } from '@/types'

const defaultForm = { title: '', description: '', content: '', eligibility: '', benefits: '', status: 'draft', startsAt: '', endsAt: '' }

export default function RegionProgramsAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: programs, loading, refetch } = useApi<Program[]>(`/api/programs/${slug}`)
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const handleSave = async () => {
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    const res = await mutate(`/api/programs/${slug}`, method, body)
    if (res.success) { success(editId ? 'Updated!' : 'Created!'); setModal(false); setEditId(null); setForm(defaultForm); refetch() }
    else showError(res.error || 'Failed')
  }

  const handleEdit = (p: Program) => {
    setEditId(p.id)
    setForm({ title: p.title, description: p.description || '', content: p.content || '', eligibility: p.eligibility || '', benefits: p.benefits || '', status: p.status, startsAt: p.startsAt?.slice(0, 10) || '', endsAt: p.endsAt?.slice(0, 10) || '' })
    setModal(true)
  }

  const handleDelete = async (id: string) => {
    const res = await mutate(`/api/programs/${slug}?id=${id}`, 'DELETE')
    if (res.success) { success('Deleted'); refetch() } else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><Briefcase size={24} className="text-red-500" /> Programs</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Manage programs for {slug}</p></div>
        <Button onClick={() => { setEditId(null); setForm(defaultForm); setModal(true) }}><Plus size={16} /> New Program</Button>
      </motion.div>

      {loading ? <PageLoader /> : programs && programs.length > 0 ? (
        <div className="space-y-3">{programs.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div className="flex-1"><div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{p.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(p.status)}`}>{p.status}</span>
            </div>{p.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">{p.description}</p>}</div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit size={14} /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} className="text-red-600 dark:text-red-400" /></Button>
            </div>
          </Card>
        ))}</div>
      ) : <EmptyState icon={<Briefcase size={40} />} title="No programs" action={<Button onClick={() => setModal(true)}><Plus size={16} /> Create</Button>} />}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Program' : 'New Program'} size="lg">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[150px]" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Eligibility" value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
            <Input label="Benefits" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Status</label>
              <select className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option>
              </select></div>
            <Input label="Start Date" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <Input label="End Date" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
