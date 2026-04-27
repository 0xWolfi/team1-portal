'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Plus, Trash2, X } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useToast } from '@/context/toast-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageLoader } from '@/components/ui/spinner'
import { getRoleBadgeColor, formatDate } from '@/lib/helpers'
import type { Region } from '@/types'

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
  user: { id: string; email: string; displayName: string; username: string | null; avatarUrl: string | null; bio?: string | null; createdAt?: string }
  memberships: MembershipItem[]
}

export default function AdminMembersPage() {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
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

  const handleAddMember = async () => {
    if (!addForm.email) {
      showError('Email is required')
      return
    }
    if (addForm.role !== 'super_admin' && !addForm.regionId) {
      showError('Region is required')
      return
    }
    const payload = addForm.role === 'super_admin'
      ? { email: addForm.email, role: addForm.role }
      : addForm
    const res = await mutate('/api/admin/members', 'POST', payload)
    if (res.success) {
      success(addForm.role === 'super_admin' ? 'Super admin added successfully!' : 'Member added successfully!')
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
      </div>

      {loading ? <PageLoader /> : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700/50">
            {result?.items.map((m) => {
              const visibleRegions = m.memberships.slice(0, 3)
              const extraCount = m.memberships.length - visibleRegions.length
              const topRole = m.memberships.find((x) => x.role === 'lead')?.role
                || m.memberships.find((x) => x.role === 'co_lead')?.role
                || m.memberships[0]?.role
                || m.role
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
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value, regionId: e.target.value === 'super_admin' ? '' : addForm.regionId })}
            >
              <option value="member">Member</option>
              <option value="co_lead">Co-Lead</option>
              <option value="lead">Lead</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {addForm.role !== 'super_admin' && (
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
