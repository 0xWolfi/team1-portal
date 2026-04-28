'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Plus, Pencil } from 'lucide-react'
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

interface RegionRow extends Region {
  memberships?: { role: string; user: { id: string; displayName: string } }[]
}

function parseCountries(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function normalizeCountriesInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export default function AdminRegionsPage() {
  const { data: regions, loading, refetch } = useApi<RegionRow[]>('/api/admin/regions')
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RegionRow | null>(null)
  const [form, setForm] = useState({ name: '', country: '', description: '', countriesText: '' })

  const handleCreate = async () => {
    const countriesList = normalizeCountriesInput(form.countriesText)
    const payload: Record<string, unknown> = {
      name: form.name,
      country: form.country,
      description: form.description,
    }
    if (countriesList.length > 0) {
      payload.countries = JSON.stringify(countriesList)
    }
    const res = await mutate('/api/admin/regions', 'POST', payload)
    if (res.success) {
      success('Region created!')
      setCreateOpen(false)
      setForm({ name: '', country: '', description: '', countriesText: '' })
      refetch()
    } else showError(res.error || 'Failed')
  }

  const openEdit = (r: RegionRow) => {
    setEditTarget(r)
    setForm({
      name: r.name,
      country: r.country || '',
      description: r.description || '',
      countriesText: parseCountries(r.countries).join('\n'),
    })
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    const countriesList = normalizeCountriesInput(form.countriesText)
    const payload = {
      name: form.name,
      country: form.country,
      description: form.description,
      countries: countriesList.length > 0 ? JSON.stringify(countriesList) : null,
    }
    const res = await mutate(`/api/admin/regions/${editTarget.id}`, 'PUT', payload)
    if (res.success) {
      success('Region updated!')
      setEditTarget(null)
      setForm({ name: '', country: '', description: '', countriesText: '' })
      refetch()
    } else showError(res.error || 'Failed')
  }

  const renderCountryChips = (text: string) => {
    const list = normalizeCountriesInput(text)
    if (list.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {list.map((c) => (
          <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/5">
            {c}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><Globe size={24} className="text-red-500" /> Regions</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{regions?.length || 0} regions</p>
        </div>
        <Button onClick={() => { setForm({ name: '', country: '', description: '', countriesText: '' }); setCreateOpen(true) }}><Plus size={16} /> Add Region</Button>
      </motion.div>

      {loading ? <PageLoader /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions?.map((r) => {
            const countriesList = parseCountries(r.countries)
            return (
              <Card key={r.id} hover>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{r.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                    <button
                      onClick={() => openEdit(r)}
                      className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit region"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{r.country} &middot; {r._count?.memberships || 0} members</p>
                <p className="text-xs text-zinc-500 mt-1">/{r.slug}</p>
                {countriesList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-600 mb-1.5 uppercase tracking-wider">Roll-up Countries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {countriesList.map((c) => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/5">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {r.memberships?.filter((m) => m.role === 'lead').map((m) => (
                  <p key={m.user.id} className="text-xs text-red-600 dark:text-red-500 mt-2">Lead: {m.user.displayName}</p>
                ))}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Region">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., India" />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g., India" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Roll-up Countries</label>
            <Textarea
              value={form.countriesText}
              onChange={(e) => setForm({ ...form, countriesText: e.target.value })}
              placeholder={'One country per line, or comma-separated.\nExample:\nIndia\nPakistan\nNepal'}
              rows={4}
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
              Members whose profile country matches one of these will roll up to this region for leads.
            </p>
            {renderCountryChips(form.countriesText)}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Region</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name || 'Region'}`}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Roll-up Countries</label>
            <Textarea
              value={form.countriesText}
              onChange={(e) => setForm({ ...form, countriesText: e.target.value })}
              placeholder={'One country per line, or comma-separated.\nExample:\nIndia\nPakistan\nNepal'}
              rows={4}
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
              Members whose profile country matches one of these will roll up to this region for leads.
            </p>
            {renderCountryChips(form.countriesText)}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
