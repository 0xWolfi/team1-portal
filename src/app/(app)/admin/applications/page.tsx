'use client'
import { useState } from 'react'
import { ClipboardList, Check, X as XIcon, Eye, MapPin, Clock, Link2, MessageCircle } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { formatDate, getStatusBadgeColor } from '@/lib/helpers'
import type { MembershipApplication, Region } from '@/types'

export default function AdminApplicationsPage() {
  const [tab, setTab] = useState('pending')
  const { data: result, loading, refetch } = useApi<{ items: MembershipApplication[]; total: number }>(`/api/applications?status=${tab}`, [tab])
  const { data: regions } = useApi<Region[]>('/api/regions')
  const { mutate, loading: mutating } = useMutation()
  const { success, error: showError } = useToast()

  const [selected, setSelected] = useState<MembershipApplication | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null)

  const handleReview = async () => {
    if (!selected || !reviewAction) return
    const res = await mutate(`/api/admin/applications/${selected.id}`, 'PUT', {
      status: reviewAction,
      reviewNote,
      regionId: reviewAction === 'approved' ? selectedRegion : undefined,
    })
    if (res.success) {
      success(`Application ${reviewAction}!`)
      setSelected(null)
      setReviewNote('')
      setSelectedRegion('')
      setReviewAction(null)
      refetch()
    } else showError(res.error || 'Failed')
  }

  const tabs = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/5">
            <ClipboardList size={20} className="text-zinc-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Applications</h1>
            <p className="text-sm text-zinc-400">{result?.total || 0} {tab} applications</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1 border border-white/5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              tab === t.value
                ? 'bg-brand-500 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
        </div>
      ) : result && result.items.length > 0 ? (
        <div className="rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden divide-y divide-white/5">
          {result.items.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              onClick={() => { setSelected(app); setReviewAction(null) }}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                {app.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{app.fullName}</p>
                <p className="text-xs text-zinc-500 truncate">{app.email}</p>
              </div>

              {/* Country */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
                <MapPin size={12} />
                <span>{app.country}{app.city ? `, ${app.city}` : ''}</span>
              </div>

              {/* Date */}
              <span className="text-[10px] text-zinc-600 hidden md:block">{formatDate(app.createdAt)}</span>

              {/* Status */}
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${getStatusBadgeColor(app.status)}`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </span>

              {/* Quick actions for pending */}
              {tab === 'pending' && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(app); setReviewAction('approved') }}
                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(app); setReviewAction('rejected') }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Reject"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border-2 border-white/5 rounded-[2rem] border-dashed bg-white/5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-zinc-600" />
          </div>
          <h3 className="text-zinc-200 text-lg font-bold mb-1">No {tab} applications</h3>
          <p className="text-zinc-500 text-sm">Applications will appear here when submitted.</p>
        </div>
      )}

      {/* Application Detail Slide-out */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSelected(null); setReviewAction(null) }} />
          <div className="relative w-full max-w-lg bg-zinc-900 border-l border-white/5 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-zinc-900 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">Application Details</h2>
                <p className="text-xs text-zinc-500">Submitted {formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => { setSelected(null); setReviewAction(null) }} className="text-zinc-400 hover:text-white cursor-pointer">
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xl shrink-0">
                  {selected.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selected.fullName}</h3>
                  <p className="text-sm text-zinc-400">{selected.email}</p>
                </div>
                <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full border font-medium ${getStatusBadgeColor(selected.status)}`}>
                  {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                </span>
              </div>

              {/* Q1: Contact Info */}
              <Section title="Contact Information">
                <Field label="Discord" value={selected.discord} />
                <Field label="X (Twitter)" value={selected.xHandle} />
                <Field label="Telegram" value={selected.telegram} />
                <Field label="GitHub" value={selected.github} />
              </Section>

              {/* Q2: Location */}
              <Section title="Location">
                <Field label="Country" value={selected.country} />
                <Field label="City" value={selected.city} />
              </Section>

              {/* Q3: Interests */}
              {selected.interests && (
                <Section title="Interests in team1">
                  <div className="flex flex-wrap gap-2">
                    {selected.interests.split(',').map((interest, i) => (
                      <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg">
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                  {selected.interestsOther && (
                    <p className="text-sm text-zinc-300 mt-2">Other: {selected.interestsOther}</p>
                  )}
                </Section>
              )}

              {/* Q4: Familiarity */}
              {selected.familiarity && (
                <Section title="Avalanche Familiarity">
                  <p className="text-sm text-zinc-300">{selected.familiarity}</p>
                </Section>
              )}

              {/* Q5: Excitement */}
              {selected.excitement && (
                <Section title="What Excites Them">
                  <p className="text-sm text-zinc-300 leading-relaxed">{selected.excitement}</p>
                </Section>
              )}

              {/* Q6: Portfolio */}
              {(selected.portfolioLink || selected.portfolioContext) && (
                <Section title="Portfolio / Work Sample">
                  {selected.portfolioLink && (
                    <a
                      href={selected.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <Link2 size={14} />
                      {selected.portfolioLink}
                    </a>
                  )}
                  {selected.portfolioContext && (
                    <p className="text-sm text-zinc-400 mt-1">{selected.portfolioContext}</p>
                  )}
                </Section>
              )}

              {/* Q7: Time Commitment */}
              {selected.timeCommitment && (
                <Section title="Time Commitment">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Clock size={14} className="text-zinc-500" />
                    {selected.timeCommitment}
                  </div>
                </Section>
              )}

              {/* Q8: Anything Else */}
              {selected.anythingElse && (
                <Section title="Additional Notes">
                  <p className="text-sm text-zinc-300 leading-relaxed">{selected.anythingElse}</p>
                </Section>
              )}

              {/* Review Note (if already reviewed) */}
              {selected.reviewNote && (
                <Section title="Review Note">
                  <p className="text-sm text-zinc-300">{selected.reviewNote}</p>
                </Section>
              )}

              {/* Action section */}
              {tab === 'pending' && !reviewAction && (
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setReviewAction('approved')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-emerald-500/20"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    onClick={() => setReviewAction('rejected')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-red-500/20"
                  >
                    <XIcon size={16} /> Reject
                  </button>
                </div>
              )}

              {/* Review form */}
              {reviewAction && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-base font-bold text-white">
                    {reviewAction === 'approved' ? 'Approve Application' : 'Reject Application'}
                  </h3>

                  {reviewAction === 'approved' && (
                    <div>
                      <label className="block text-sm text-zinc-300 mb-1.5">Assign to Region *</label>
                      <select
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                      >
                        <option value="">Select region</option>
                        {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-zinc-300 mb-1.5">Note (optional)</label>
                    <textarea
                      className="w-full min-h-[80px] bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 resize-y"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Add a note about this decision..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setReviewAction(null)}
                      className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReview}
                      disabled={mutating || (reviewAction === 'approved' && !selectedRegion)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                        reviewAction === 'approved'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {mutating ? 'Processing...' : reviewAction === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper Components ──────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-300">{value}</span>
    </div>
  )
}
