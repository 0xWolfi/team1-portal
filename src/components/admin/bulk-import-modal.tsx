'use client'
import { useMemo, useState } from 'react'
import { Upload, ClipboardCopy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { useToast } from '@/context/toast-context'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EXAMPLE_CSV = `email,region
xavier@example.com,India
bob@example.com,United States`

type ParsedRow = {
  rowNum: number
  email: string
  region: string
  clientStatus: 'valid' | 'invalid'
  clientReason?: string
}

type ServerOutcome = {
  email: string
  region: string
  status: 'imported' | 'skipped'
  reason?: string
}

type ImportSummary = {
  total: number
  imported: number
  skipped: number
  results: ServerOutcome[]
}

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

function parseCsv(text: string): { rows: ParsedRow[]; error: string | null } {
  const cleaned = text.replace(/^﻿/, '')
  const nonBlank: string[] = []
  for (const line of cleaned.split(/\r\n|\n/)) {
    if (line.trim().length > 0) nonBlank.push(line)
  }
  if (nonBlank.length === 0) return { rows: [], error: 'CSV is empty' }

  const headerRaw = nonBlank[0]
  const headerCells = splitCsvLine(headerRaw).map((c) => c.trim().toLowerCase())
  if (headerCells.length < 2 || headerCells[0] !== 'email' || headerCells[1] !== 'region') {
    return { rows: [], error: "Invalid header. Expected 'email,region' as the first row." }
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < nonBlank.length; i++) {
    const cells = splitCsvLine(nonBlank[i])
    const email = (cells[0] || '').trim()
    const region = (cells[1] || '').trim()
    let clientStatus: 'valid' | 'invalid' = 'valid'
    let clientReason: string | undefined
    if (!email || !region) {
      clientStatus = 'invalid'
      clientReason = 'Missing field'
    } else if (!EMAIL_RE.test(email)) {
      clientStatus = 'invalid'
      clientReason = 'Invalid email'
    }
    rows.push({ rowNum: i, email, region, clientStatus, clientReason })
  }
  return { rows, error: null }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out
}

export function BulkImportModal({ open, onClose, onImported }: BulkImportModalProps) {
  const { success, error: showError } = useToast()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [showSkipped, setShowSkipped] = useState(true)
  const [copied, setCopied] = useState(false)

  const { rows, error } = useMemo(() => {
    if (!text.trim()) return { rows: [] as ParsedRow[], error: null as string | null }
    return parseCsv(text)
  }, [text])

  const validCount = rows.filter((r) => r.clientStatus === 'valid').length
  const invalidCount = rows.length - validCount

  const reset = () => {
    setText('')
    setResult(null)
    setShowSkipped(true)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleDone = () => {
    reset()
    onClose()
    onImported()
  }

  const handleFile = async (file: File) => {
    const content = await file.text()
    setText(content)
    setResult(null)
  }

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_CSV)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showError('Failed to copy')
    }
  }

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.clientStatus === 'valid').map((r) => ({ email: r.email, region: r.region }))
    if (validRows.length === 0) {
      showError('No valid rows to import')
      return
    }
    setSubmitting(true)
    const res = await api.post<{ summary: ImportSummary }>('/api/admin/members/bulk-import', { rows: validRows })
    setSubmitting(false)
    if (res.success && res.data) {
      setResult(res.data.summary)
      if (res.data.summary.imported > 0) {
        success(`${res.data.summary.imported} member${res.data.summary.imported === 1 ? '' : 's'} imported`)
      }
    } else {
      showError(res.error || 'Import failed')
    }
  }

  const skippedResults = result?.results.filter((r) => r.status === 'skipped') || []

  return (
    <Modal open={open} onClose={handleClose} title="Import Members from CSV" size="lg">
      <div className="space-y-4">
        {!result && (
          <>
            <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                CSV format: header row <code className="px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">email,region</code>, then one row per member. Region must match an existing region name or slug. Every imported member is added with the <span className="text-zinc-800 dark:text-zinc-200 font-medium">member</span> role.
              </p>
              <div className="flex items-start gap-3">
                <pre className="flex-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 bg-white border border-zinc-200 dark:bg-zinc-950/50 dark:border-white/5 rounded-lg p-2 overflow-x-auto whitespace-pre">{EXAMPLE_CSV}</pre>
                <button
                  type="button"
                  onClick={handleCopyExample}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Copy example CSV"
                >
                  {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="group cursor-pointer flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 hover:border-red-400 dark:hover:border-red-500/40 hover:bg-red-50/40 dark:hover:bg-red-500/5 transition-colors">
                <Upload size={18} className="text-zinc-500 group-hover:text-red-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Upload CSV file</span>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
              </label>
              <div className="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-center">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">…or paste CSV below</span>
                <span className="text-[10px] text-zinc-500">Header row required</span>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE_CSV}
              className="w-full min-h-[140px] p-3 font-mono text-xs bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 resize-y"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 text-xs text-red-700 dark:text-red-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!error && rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {rows.length} row{rows.length === 1 ? '' : 's'} parsed
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400">{validCount} valid</span>
                    {invalidCount > 0 && <span className="text-red-600 dark:text-red-400">{invalidCount} invalid</span>}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-200 dark:border-white/5">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0">
                      <tr className="text-left text-zinc-500">
                        <th className="px-3 py-2 w-10">#</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Region</th>
                        <th className="px-3 py-2 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {rows.map((r) => (
                        <tr key={r.rowNum} className="bg-white dark:bg-zinc-900/30">
                          <td className="px-3 py-2 text-zinc-500 font-mono">{r.rowNum}</td>
                          <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 font-mono break-all">{r.email || <span className="text-zinc-400">—</span>}</td>
                          <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{r.region || <span className="text-zinc-400">—</span>}</td>
                          <td className="px-3 py-2">
                            {r.clientStatus === 'valid' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400" title={r.clientReason}>
                                {r.clientReason || 'Invalid'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Region matching, duplicates, and unknown regions are validated server-side at import time.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={submitting || validCount === 0 || !!error}
                loading={submitting}
              >
                {submitting ? 'Importing…' : `Import ${validCount} row${validCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total</p>
                <p className="text-2xl font-medium text-zinc-900 dark:text-white">{result.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Imported</p>
                <p className="text-2xl font-medium text-emerald-700 dark:text-emerald-300">{result.imported}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Skipped</p>
                <p className="text-2xl font-medium text-amber-700 dark:text-amber-300">{result.skipped}</p>
              </div>
            </div>

            {skippedResults.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSkipped((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span>Skipped rows ({skippedResults.length})</span>
                  {showSkipped ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showSkipped && (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white dark:bg-zinc-900/30 sticky top-0">
                        <tr className="text-left text-zinc-500">
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Region</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {skippedResults.map((r, i) => (
                          <tr key={i} className="bg-white dark:bg-zinc-900/30">
                            <td className="px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200 break-all">{r.email}</td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{r.region}</td>
                            <td className="px-3 py-2 text-amber-700 dark:text-amber-400">{r.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={handleDone}>Done</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
