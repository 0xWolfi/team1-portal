'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Search, Upload, Trash2, Plus, CheckCircle, XCircle, Download } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageLoader } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/helpers'
import type { MemberRosterEntry } from '@/types'

export default function AdminRosterPage() {
  const [search, setSearch] = useState('')
  const { data: result, loading, refetch } = useApi<{ items: MemberRosterEntry[]; total: number }>(
    `/api/admin/roster${search ? `?search=${search}` : ''}`, [search]
  )
  const { mutate, loading: mutating } = useMutation()
  const { success, error: showError } = useToast()

  // Add single modal
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', xHandle: '', name: '' })

  // CSV import
  const [importModal, setImportModal] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAddSingle = async () => {
    if (!addForm.email && !addForm.xHandle) {
      showError('Email or X handle is required')
      return
    }
    const res = await mutate('/api/admin/roster', 'POST', addForm)
    if (res.success) {
      success('Added to roster!')
      setAddModal(false)
      setAddForm({ email: '', xHandle: '', name: '' })
      refetch()
    } else {
      showError(res.error || 'Failed to add')
    }
  }

  const handleDelete = async (id: string) => {
    const res = await mutate(`/api/admin/roster?id=${id}`, 'DELETE')
    if (res.success) {
      success('Removed from roster')
      refetch()
    } else {
      showError(res.error || 'Failed')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '')
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleBulkImport = async () => {
    const lines = csvText.split('\n').filter((l) => l.trim())
    const entries: Array<{ email?: string; xHandle?: string; name?: string }> = []

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim())
      // Support: email,xHandle,name or email,name or just email
      if (parts.length === 0 || !parts[0]) continue
      const first = parts[0]
      if (first.includes('@')) {
        entries.push({ email: first, xHandle: parts[1] || undefined, name: parts[2] || parts[1] || undefined })
      } else {
        entries.push({ xHandle: first.replace('@', ''), name: parts[1] || undefined })
      }
    }

    if (entries.length === 0) {
      showError('No valid entries found')
      return
    }

    const res = await mutate('/api/admin/roster', 'POST', { entries })
    if (res.success && res.data) {
      const data = res.data as any
      setImportResult({ added: data.added, skipped: data.skipped })
      success(`Imported ${data.added} entries!`)
      refetch()
    } else {
      showError(res.error || 'Import failed')
    }
  }

  const downloadTemplate = () => {
    const csv = 'email,xHandle,name\njohn@example.com,@johndoe,John Doe\njane@example.com,@janedoe,Jane Doe'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'roster-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white flex items-center gap-2">
            <UserPlus size={24} className="text-red-500" /> Member Roster
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{result?.total || 0} entries &middot; Import members by email or X handle to allow login</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setImportModal(true)}><Upload size={16} /> Bulk Import</Button>
          <Button onClick={() => setAddModal(true)}><Plus size={16} /> Add Entry</Button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          className="w-full h-10 pl-9 pr-4 bg-zinc-900/50 border border-white/5 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
          placeholder="Search by email, X handle, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? <PageLoader /> : result && result.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-zinc-700/50">
            {result.items.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                  {(entry.name || entry.email || entry.xHandle || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.name || 'No name'}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {entry.email && <span>{entry.email}</span>}
                    {entry.xHandle && <span>@{entry.xHandle}</span>}
                  </div>
                </div>
                <Badge variant={entry.isUsed ? 'success' : 'warning'}>
                  {entry.isUsed ? 'Signed Up' : 'Pending'}
                </Badge>
                <span className="text-[10px] text-zinc-600">{formatDate(entry.createdAt)}</span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<UserPlus size={40} />}
          title="No roster entries"
          description="Import members by email or X handle to control who can log in."
          action={<Button onClick={() => setImportModal(true)}><Upload size={16} /> Import Roster</Button>}
        />
      )}

      {/* Add Single Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add to Roster">
        <div className="space-y-4">
          <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="member@example.com" />
          <Input label="X Handle" value={addForm.xHandle} onChange={(e) => setAddForm({ ...addForm, xHandle: e.target.value })} placeholder="@handle" />
          <Input label="Name (optional)" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" />
          <p className="text-xs text-zinc-500">At least email or X handle is required. This person will be able to log in via Google OAuth.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddSingle} disabled={mutating}>{mutating ? 'Adding...' : 'Add to Roster'}</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={importModal} onClose={() => { setImportModal(false); setCsvText(''); setImportResult(null) }} title="Bulk Import Roster" size="lg">
        <div className="space-y-4">
          {!importResult ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">Upload a CSV or paste entries below.</p>
                <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer">
                  <Download size={12} /> Download Template
                </button>
              </div>
              <div className="bg-zinc-800/50 border border-white/5 rounded-xl p-3 text-xs text-zinc-500">
                <strong className="text-zinc-300">Format:</strong> One entry per line. CSV format: <code className="text-zinc-400">email,xHandle,name</code>
                <br />Lines starting with an email (contains @) are treated as email entries. Otherwise treated as X handle.
              </div>

              <div>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                <Button variant="ghost" onClick={() => fileRef.current?.click()} className="mb-2">
                  <Upload size={14} /> Upload CSV File
                </Button>
              </div>

              <textarea
                className="w-full min-h-[200px] bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 font-mono text-xs resize-y"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'email,xHandle,name\njohn@example.com,@johndoe,John Doe\njane@example.com,@janedoe,Jane Doe'}
              />

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setImportModal(false); setCsvText('') }}>Cancel</Button>
                <Button onClick={handleBulkImport} disabled={mutating || !csvText.trim()}>
                  {mutating ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={40} className="mx-auto text-emerald-400" />
              <h3 className="text-lg font-medium text-white">Import Complete</h3>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{importResult.added}</p>
                  <p className="text-xs text-zinc-500">Added</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-500">{importResult.skipped}</p>
                  <p className="text-xs text-zinc-500">Skipped</p>
                </div>
              </div>
              <Button onClick={() => { setImportModal(false); setCsvText(''); setImportResult(null) }}>Done</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
