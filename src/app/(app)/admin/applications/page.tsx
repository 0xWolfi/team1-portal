'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Check, X, Eye } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { PageLoader } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, getStatusBadgeColor } from '@/lib/helpers'
import type { MembershipApplication, Region } from '@/types'

export default function AdminApplicationsPage() {
  const [tab, setTab] = useState('pending')
  const { data: result, loading, refetch } = useApi<{ items: MembershipApplication[]; total: number }>(`/api/applications?status=${tab}`, [tab])
  const { data: regions } = useApi<Region[]>('/api/regions')
  const { mutate } = useMutation()
  const { success, error: showError } = useToast()
  const [detail, setDetail] = useState<MembershipApplication | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null)

  const handleReview = async () => {
    if (!detail || !reviewAction) return
    const res = await mutate(`/api/admin/applications/${detail.id}`, 'PUT', {
      status: reviewAction,
      reviewNote,
      regionId: reviewAction === 'approved' ? selectedRegion : undefined,
    })
    if (res.success) {
      success(`Application ${reviewAction}!`)
      setDetail(null)
      setReviewNote('')
      setSelectedRegion('')
      setReviewAction(null)
      refetch()
    } else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-white flex items-center gap-2"><ClipboardList size={24} className="text-red-500" /> Applications</h1>
        <p className="text-sm text-zinc-400 mt-1">{result?.total || 0} {tab} applications</p>
      </motion.div>

      <Tabs tabs={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} active={tab} onChange={setTab} />

      {loading ? <PageLoader /> : result && result.items.length > 0 ? (
        <div className="space-y-3">
          {result.items.map((app) => (
            <Card key={app.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{app.fullName}</p>
                <p className="text-xs text-zinc-400">{app.email} &middot; {app.country}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Applied: {formatDate(app.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(app.status)}`}>{app.status}</span>
                {tab === 'pending' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setDetail(app); setReviewAction('approved') }}><Check size={14} className="text-emerald-400" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDetail(app); setReviewAction('rejected') }}><X size={14} className="text-red-400" /></Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setDetail(app); setReviewAction(null) }}><Eye size={14} /></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ClipboardList size={40} />} title={`No ${tab} applications`} />
      )}

      {/* Review modal */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setReviewAction(null) }} title={reviewAction ? `${reviewAction === 'approved' ? 'Approve' : 'Reject'} Application` : 'Application Details'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-400 text-xs">Name</span><p className="text-white">{detail.fullName}</p></div>
              <div><span className="text-zinc-400 text-xs">Email</span><p className="text-white">{detail.email}</p></div>
              <div><span className="text-zinc-400 text-xs">Discord</span><p className="text-white">{detail.discord}</p></div>
              <div><span className="text-zinc-400 text-xs">X Handle</span><p className="text-white">{detail.xHandle}</p></div>
              <div><span className="text-zinc-400 text-xs">Country</span><p className="text-white">{detail.country}{detail.city ? `, ${detail.city}` : ''}</p></div>
              <div><span className="text-zinc-400 text-xs">Telegram</span><p className="text-white">{detail.telegram || '-'}</p></div>
              <div><span className="text-zinc-400 text-xs">GitHub</span><p className="text-white">{detail.github || '-'}</p></div>
              <div><span className="text-zinc-400 text-xs">Familiarity</span><p className="text-white">{detail.familiarity || '-'}</p></div>
              <div><span className="text-zinc-400 text-xs">Time Commitment</span><p className="text-white">{detail.timeCommitment || '-'}</p></div>
            </div>
            {detail.interests && <div><span className="text-zinc-400 text-xs">Interests</span><p className="text-sm text-white">{detail.interests}{detail.interestsOther ? `, ${detail.interestsOther}` : ''}</p></div>}
            {detail.excitement && <div><span className="text-zinc-400 text-xs">What Excites Them</span><p className="text-sm text-white">{detail.excitement}</p></div>}
            {detail.portfolioLink && <div><span className="text-zinc-400 text-xs">Portfolio</span><p className="text-sm text-white"><a href={detail.portfolioLink} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">{detail.portfolioLink}</a>{detail.portfolioContext ? ` — ${detail.portfolioContext}` : ''}</p></div>}
            {detail.anythingElse && <div><span className="text-zinc-400 text-xs">Anything Else</span><p className="text-sm text-white">{detail.anythingElse}</p></div>}

            {reviewAction && (
              <>
                {reviewAction === 'approved' && (
                  <div className="space-y-1.5">
                    <label className="block text-sm text-zinc-300 font-medium">Assign to Region *</label>
                    <select className="w-full h-11 px-4 bg-zinc-950 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-red-500" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                      <option value="">Select region</option>
                      {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}
                <Textarea label="Review Note" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional note..." />
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => { setDetail(null); setReviewAction(null) }}>Cancel</Button>
                  <Button variant={reviewAction === 'approved' ? 'primary' : 'danger'} onClick={handleReview} disabled={reviewAction === 'approved' && !selectedRegion}>
                    {reviewAction === 'approved' ? 'Approve' : 'Reject'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
