'use client'
import { useState, useEffect } from 'react'
import { Plus, Save, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useToast } from '@/context/toast-context'
import type { MemberActivity } from '@/types'

export const ACTIVITY_TYPES = [
  { value: 'organized_event', label: 'Organized Event' },
  { value: 'attended_event', label: 'Attended Event' },
  { value: 'submitted_pr', label: 'Submitted PR' },
  { value: 'created_content', label: 'Created Content' },
  { value: 'other', label: 'Other' },
]

export const VISIBILITY_OPTIONS: Array<{ value: number; label: string; help: string }> = [
  { value: 0, label: 'Private', help: 'Only super admins can see this entry.' },
  { value: 1, label: 'Leads only', help: 'Region leads (your region) and admins can see this entry.' },
  { value: 2, label: 'Members', help: 'All signed-in team1 members can see this entry.' },
  { value: 3, label: 'Public', help: 'Anyone can see this entry.' },
]

export function visibilityLabel(v: number | null | undefined): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? 'Leads only'
}

const inputClass =
  'w-full bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/10'

interface ActivityFormState {
  type: string
  title: string
  description: string
  date: string
  link: string
  visibility: number
}

const EMPTY_FORM: ActivityFormState = {
  type: 'organized_event',
  title: '',
  description: '',
  date: '',
  link: '',
  visibility: 1,
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (activity: MemberActivity) => void
  /** When provided, the dialog edits this existing activity instead of creating a new one. */
  initial?: MemberActivity | null
}

export function ActivityDialog({ open, onClose, onSaved, initial }: Props) {
  const { success, error: showError } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ActivityFormState>(EMPTY_FORM)
  const isEdit = !!initial

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        type: initial.type || 'organized_event',
        title: initial.title || '',
        description: initial.description || '',
        date: initial.date ? initial.date.slice(0, 10) : '',
        link: initial.link || '',
        visibility: typeof initial.visibility === 'number' ? initial.visibility : 1,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, initial])

  if (!open) return null

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      showError('Title and date are required')
      return
    }
    setSaving(true)
    const body = {
      type: form.type,
      title: form.title.trim(),
      description: form.description || undefined,
      date: form.date,
      link: form.link || undefined,
      visibility: form.visibility,
    }
    const res = isEdit && initial
      ? await api.patch<MemberActivity>('/api/activities', { id: initial.id, ...body })
      : await api.post<MemberActivity>('/api/activities', body)
    setSaving(false)
    if (res.success && res.data) {
      success(isEdit ? 'Activity updated!' : 'Activity added!')
      onSaved(res.data)
      onClose()
    } else {
      showError(res.error || 'Failed to save activity')
    }
  }

  const visHelp = VISIBILITY_OPTIONS.find((o) => o.value === form.visibility)?.help

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">{isEdit ? 'Edit Activity' : 'Add Activity'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer">
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
                <option key={t.value} value={t.value}>{t.label}</option>
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
          <div className="space-y-1.5">
            <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Visibility</label>
            <select
              className={`${inputClass} appearance-none cursor-pointer`}
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: parseInt(e.target.value, 10) })}
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.value} — {o.label}</option>
              ))}
            </select>
            {visHelp && <p className="text-xs text-zinc-500 dark:text-zinc-600">{visHelp}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? <Save size={14} /> : <Plus size={14} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
