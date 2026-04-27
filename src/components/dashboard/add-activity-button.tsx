'use client'
import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useToast } from '@/context/toast-context'
import type { MemberActivity } from '@/types'

const ACTIVITY_TYPES = [
  { value: 'organized_event', label: 'Organized Event' },
  { value: 'attended_event', label: 'Attended Event' },
  { value: 'submitted_pr', label: 'Submitted PR' },
  { value: 'created_content', label: 'Created Content' },
  { value: 'other', label: 'Other' },
]

const inputClass =
  'w-full bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/10'

interface Props {
  onCreated?: (activity: MemberActivity) => void
  className?: string
}

export function AddActivityButton({ onCreated, className = '' }: Props) {
  const { success, error: showError } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'organized_event',
    title: '',
    description: '',
    date: '',
    link: '',
  })

  const reset = () => setForm({ type: 'organized_event', title: '', description: '', date: '', link: '' })

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      showError('Title and date are required')
      return
    }
    setSaving(true)
    const res = await api.post<MemberActivity>('/api/activities', form)
    setSaving(false)
    if (res.success && res.data) {
      success('Activity added!')
      onCreated?.(res.data)
      setOpen(false)
      reset()
    } else {
      showError(res.error || 'Failed to add activity')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0 ${className}`}
      >
        <Plus size={14} /> Add Activity
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Add Activity</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Type</label>
                <select
                  className={`${inputClass} appearance-none cursor-pointer`}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Title *</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What did you do?"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Description</label>
                <textarea
                  className={`${inputClass} min-h-[60px] resize-y`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Date *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Link</label>
                  <input
                    className={inputClass}
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? 'Adding...' : 'Add Activity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
