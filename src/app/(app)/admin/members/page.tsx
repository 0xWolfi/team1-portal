'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Plus, Trash2, X } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageLoader } from '@/components/ui/spinner'
import { getRoleBadgeColor, formatDate } from '@/lib/helpers'
import type { Region } from '@/types'

type MemberStatus = 'active' | 'flagged' | 'paused' | 'inactive' | 'removed'

const STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'removed', label: 'Removed' },
]

const STATUS_PILL_CLASS: Record<MemberStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  flagged: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  paused: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/20',
  inactive: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20',
  removed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface MembershipItem {
  id: string
  role: string
  status: string
  isPrimary: boolean
  createdAt: string
  region: { id: string; name: string; slug: string }
}

interface MemberEntry {
  id: string
  role: string
  status: string
  createdAt: string
  user: { id: string; email: string; displayName: string; username: string | null; avatarUrl: string | null; bio?: string | null; createdAt?: string; status?: MemberStatus; isActive?: boolean }
  memberships: MembershipItem[]
}

export default function AdminMembersPage() {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | MemberStatus>('')
  const { data: regions } = useApi<Region[]>('/api/regions')
  const { data: result, loading, refetch } = useApi<{ items: MemberEntry[]; total: number }>(
    `/api/admin/members?page=1${search ? `&search=${search}` : ''}${regionFilter ? `&regionId=${regionFilter}` : ''}`,
    [search, regionFilter]
  )
  const { mutate, loading: mutating } = useMutation()
  const { success, error: showError } = useToast()

  // Add member modal state
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', regionId: '', role: 'member' })

  // View member detail state
  const [selectedMember, setSelectedMember] = useState<MemberEntry | null>(null)

  // Delete confirm state (removing a single membership)
  const [deleteTarget, setDeleteTarget] = useState<{ member: MemberEntry; membership: MembershipItem } | null>(null)

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<{ member: MemberEntry } | null>(null)

  const updateMemberStatus = async (member: MemberEntry, next: MemberStatus) => {
    setStatusUpdating(member.user.id)
    const res = await api.fetch<{ id: string; status?: MemberStatus; isActive?: boolean }>(
      `/api/admin/users/${member.user.id}`,
      { method: 'PATCH', body: JSON.stringify({ status: next }) },
    )
    setStatusUpdating(null)
    if (res.success) {
      success(`Status updated to ${statusLabel(next)}`)
      if (selectedMember && selectedMember.user.id === member.user.id) {
        setSelectedMember({
          ...selectedMember,
          user: { ...selectedMember.user, status: next, isActive: res.data?.isActive ?? selectedMember.user.isActive },
        })
      }
      refetch()
    } else {
      showError(res.error || 'Failed to update status')
    }
  }

  const handleStatusChange = async (member: MemberEntry, next: MemberStatus) => {
    if (next === 'removed') {
      setPendingRemoval({ member })
      return
    }
    await updateMemberStatus(member, next)
  }

  const confirmRemoval = async () => {
    if (!pendingRemoval) return
    const m = pendingRemoval.member
    setPendingRemoval(null)
    await updateMemberStatus(m, 'removed')
  }

  const handleAddMember = async () => {
    if (!addForm.email) {
      showError('Email is required')
      return
    }
    const isPlatformWide = addForm.role === 'super_admin' || addForm.role === 'community_ops'
    if (!isPlatformWide && !addForm.regionId) {
      showError('Region is required')
      return
    }
    const payload = isPlatformWide
      ? { email: addForm.email, role: addForm.role }
      : addForm
    const res = await mutate('/api/admin/members', 'POST', payload)
    if (res.success) {
      const successMessage =
        addForm.role === 'super_admin'
          ? 'Super admin added successfully!'
          : addForm.role === 'community_ops'
            ? 'Community ops added successfully!'
            : 'Member added successfully!'
      success(successMessage)
      setAddModal(false)
      setAddForm({ email: '', regionId: '', role: 'member' })
      refetch()
    } else {
      showError(res.error || 'Failed to add member')
    }
  }

  const handleRemoveMember = async () => {
    if (!deleteTarget) return
    const res = await mutate(`/api/admin/members/${deleteTarget.membership.id}`, 'DELETE')
    if (res.success) {
      success('Membership removed successfully')
      // If we're viewing this member in detail, refresh their membership list locally
      if (selectedMember && selectedMember.user.id === deleteTarget.member.user.id) {
        const remaining = selectedMember.memberships.filter((mm) => mm.id !== deleteTarget.membership.id)
        if (remaining.length === 0) {
          setSelectedMember(null)
        } else {
          setSelectedMember({ ...selectedMember, memberships: remaining })
        }
      }
      setDeleteTarget(null)
      refetch()
    } else {
      showError(res.error || 'Failed to remove membership')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2"><Users size={24} className="text-red-500" /> All Members</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{result?.total || 0} total members</p>
        </div>
        <Button onClick={() => setAddModal(true)}><Plus size={16} /> Add Member</Button>
      </motion.div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className="w-full h-10 pl-9 pr-4 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-red-500" placeholder="Search by name, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-10 px-3 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="">All regions</option>
          {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="h-10 px-3 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | MemberStatus)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700/50">
            {result?.items
              .filter((m) => !statusFilter || (m.user.status || 'active') === statusFilter)
              .map((m) => {
              const visibleRegions = m.memberships.slice(0, 3)
              const extraCount = m.memberships.length - visibleRegions.length
              const topRole = m.memberships.find((x) => x.role === 'lead')?.role
                || m.memberships.find((x) => x.role === 'co_lead')?.role
                || m.memberships[0]?.role
                || m.role
              const userStatus = (m.user.status || 'active') as MemberStatus
              return (
                <div
                  key={m.user.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedMember(m)}
                >
                  <Avatar src={m.user.avatarUrl} name={m.user.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-white truncate">{m.user.displayName}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {visibleRegions.map((mm) => (
                      <Badge key={mm.id} variant="info">{mm.region.name}</Badge>
                    ))}
                    {extraCount > 0 && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-300"
                        title={m.memberships.slice(3).map((mm) => mm.region.name).join(', ')}
                      >
                        +{extraCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(topRole)}`}>
                    {topRole === 'co_lead' ? 'Co-Lead' : topRole.charAt(0).toUpperCase() + topRole.slice(1)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${STATUS_PILL_CLASS[userStatus]}`}>
                    {statusUpdating === m.user.id ? '…' : statusLabel(userStatus)}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatDate(m.createdAt)}</span>
                </div>
              )
            })}
            {result?.items.length === 0 && <div className="py-12 text-center text-sm text-zinc-500">No members found</div>}
          </div>
        </Card>
      )}

      {/* Add Member Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Member">
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            placeholder="user@example.com"
            className="bg-white border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl"
          />
          <div className="space-y-1.5">
            <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Role</label>
            <select
              className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
              value={addForm.role}
              onChange={(e) => {
                const next = e.target.value
                const platformWide = next === 'super_admin' || next === 'community_ops'
                setAddForm({ ...addForm, role: next, regionId: platformWide ? '' : addForm.regionId })
              }}
            >
              <option value="member">Member</option>
              <option value="co_lead">Co-Lead</option>
              <option value="lead">Lead</option>
              <option value="super_admin">Super Admin</option>
              <option value="community_ops">Community Ops</option>
            </select>
          </div>
          {addForm.role !== 'super_admin' && addForm.role !== 'community_ops' && (
            <div className="space-y-1.5">
              <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">Region</label>
              <select
                className="w-full h-11 px-4 bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                value={addForm.regionId}
                onChange={(e) => setAddForm({ ...addForm, regionId: e.target.value })}
              >
                <option value="">Select a region</option>
                {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {addForm.role === 'super_admin' && (
            <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400">
              Super admins have platform-wide access and are not scoped to a region.
            </div>
          )}
          {addForm.role === 'community_ops' && (
            <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400">
              Community Ops have cross-region read access and limited write access (member status, applications, announcements). They cannot edit regions or grant admin roles.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={mutating}>{mutating ? 'Adding...' : 'Add Member'}</Button>
          </div>
        </div>
      </Modal>

      {/* Member Detail Slide-out */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[70] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="relative w-full max-w-md bg-white border-l border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Member Details</h2>
                <button onClick={() => setSelectedMember(null)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar src={selectedMember.user.avatarUrl} name={selectedMember.user.displayName} size="lg" />
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">{selectedMember.user.displayName}</h3>
                    {selectedMember.user.username && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">@{selectedMember.user.username}</p>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Email</span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{selectedMember.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Joined</span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(selectedMember.createdAt)}</span>
                  </div>
                  {selectedMember.user.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-xs text-zinc-500">Account Created</span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(selectedMember.user.createdAt)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Status</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${STATUS_PILL_CLASS[(selectedMember.user.status || 'active') as MemberStatus]}`}>
                      {statusLabel(selectedMember.user.status || 'active')}
                    </span>
                  </div>
                  <select
                    className="w-full h-10 px-3 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-white/10 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-red-500 disabled:opacity-50"
                    value={selectedMember.user.status || 'active'}
                    disabled={statusUpdating === selectedMember.user.id}
                    onChange={(e) => handleStatusChange(selectedMember, e.target.value as MemberStatus)}
                  >
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-[11px] text-zinc-500">
                    Inactive and Removed members cannot log in and are hidden from the directory.
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-500">Regions & Roles</p>
                    <span className="text-[10px] text-zinc-500">{selectedMember.memberships.length} total</span>
                  </div>
                  <div className="space-y-2">
                    {selectedMember.memberships.map((mm) => (
                      <div key={mm.id} className="flex items-center gap-2">
                        <Badge variant="info">{mm.region.name}</Badge>
                        {mm.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-zinc-200 text-zinc-700 dark:border-white/10 dark:text-zinc-400">Primary</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(mm.role)}`}>
                          {mm.role === 'co_lead' ? 'Co-Lead' : mm.role.charAt(0).toUpperCase() + mm.role.slice(1)}
                        </span>
                        <span className="ml-auto text-[10px] text-zinc-500">{formatDate(mm.createdAt)}</span>
                        <button
                          onClick={() => setDeleteTarget({ member: selectedMember, membership: mm })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={`Remove from ${mm.region.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMember.user.bio && (
                  <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-2xl p-4">
                    <p className="text-xs text-zinc-500 mb-2">Bio</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{selectedMember.user.bio}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Removed-status confirm */}
      <ConfirmDialog
        open={!!pendingRemoval}
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
        title="Mark member as removed?"
        message={`This will block ${pendingRemoval?.member.user.displayName || 'this user'} from logging in and hide them from the directory. You can re-activate them later by changing their status back to Active.`}
        confirmLabel="Mark Removed"
        loading={statusUpdating === pendingRemoval?.member.user.id}
      />

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Membership" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Are you sure you want to remove <span className="text-zinc-900 dark:text-white font-medium">{deleteTarget?.member.user.displayName}</span> from <span className="text-zinc-900 dark:text-white font-medium">{deleteTarget?.membership.region.name}</span>? This will revoke their membership access in that region.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRemoveMember}
              disabled={mutating}
            >
              {mutating ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
