'use client'
import { use, useState } from 'react'
import { Users, Plus, X, Trash2 } from 'lucide-react'
import { useApi, useMutation } from '@/hooks/use-api'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/context/toast-context'
import { getRoleBadgeColor, formatDate } from '@/lib/helpers'
import type { Region } from '@/types'

interface MemberEntry {
  id: string
  role: string
  userId: string
  createdAt: string
  user: { id: string; displayName: string; username: string | null; avatarUrl: string | null; bio: string | null }
  region: { name: string; slug: string }
}

export default function RegionMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { isSuperAdmin } = useAuth()
  const { data: members, loading, refetch } = useApi<MemberEntry[]>(`/api/directory?region=${slug}`)
  const { data: region } = useApi<Region>(`/api/regions/${slug}`)
  const { mutate, loading: mutating } = useMutation()
  const { success, error: showError } = useToast()

  const [addModal, setAddModal] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MemberEntry | null>(null)

  const handleAddMember = async () => {
    if (!addEmail || !region) return
    const res = await mutate('/api/admin/members', 'POST', { email: addEmail, regionId: region.id, role: 'member' })
    if (res.success) {
      success('Member added!')
      setAddModal(false)
      setAddEmail('')
      refetch()
    } else showError(res.error || 'Failed to add member')
  }

  const handleRemove = async () => {
    if (!deleteTarget) return
    const res = await mutate(`/api/admin/members/${deleteTarget.id}`, 'DELETE')
    if (res.success) {
      success('Member removed')
      setDeleteTarget(null)
      setSelectedMember(null)
      refetch()
    } else showError(res.error || 'Failed')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
              <Users size={20} className="text-zinc-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Members</h1>
              <p className="text-sm text-zinc-400">{region?.name || slug} region &middot; {members?.length || 0} members</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
        </div>
      ) : members && members.length > 0 ? (
        <div className="rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden divide-y divide-white/5">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              onClick={() => setSelectedMember(m)}
            >
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                {m.user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{m.user.displayName}</p>
                {m.user.username && <p className="text-xs text-zinc-500">@{m.user.username}</p>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(m.role)}`}>
                {m.role === 'co_lead' ? 'Co-Lead' : m.role.charAt(0).toUpperCase() + m.role.slice(1)}
              </span>
              {/* Only super admin can remove */}
              {isSuperAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(m) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-white/5 rounded-[2rem] border-dashed bg-white/5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center mb-4">
            <Users size={28} className="text-zinc-600" />
          </div>
          <h3 className="text-zinc-200 text-lg font-bold mb-1">No members yet</h3>
          <p className="text-zinc-500 text-sm">Add members to this region to get started.</p>
        </div>
      )}

      {/* Add Member Modal */}
      {addModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-medium text-white">Add Member to {region?.name}</h2>
              <button onClick={() => setAddModal(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1.5">Email</label>
                <input
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                  placeholder="member@example.com"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
                <p className="text-[11px] text-zinc-600 mt-1">User must have an account first (signed up).</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
                <button
                  onClick={handleAddMember}
                  disabled={mutating || !addEmail}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {mutating ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Panel */}
      {selectedMember && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-white/5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-lg font-medium text-white">Member Details</h2>
              <button onClick={() => setSelectedMember(null)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xl shrink-0">
                  {selectedMember.user.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedMember.user.displayName}</h3>
                  {selectedMember.user.username && <p className="text-sm text-zinc-400">@{selectedMember.user.username}</p>}
                </div>
              </div>

              {/* Details */}
              <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Region</span>
                  <span className="text-sm text-zinc-300">{selectedMember.region.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Role</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(selectedMember.role)}`}>
                    {selectedMember.role === 'co_lead' ? 'Co-Lead' : selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                  </span>
                </div>
              </div>

              {selectedMember.user.bio && (
                <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-2">Bio</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedMember.user.bio}</p>
                </div>
              )}

              {/* Only super admin can remove */}
              {isSuperAdmin && (
                <button
                  onClick={() => { setSelectedMember(null); setDeleteTarget(selectedMember) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Remove Member
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white">Remove Member</h3>
            <p className="text-sm text-zinc-400">
              Remove <span className="text-white font-medium">{deleteTarget.user.displayName}</span> from {region?.name}? They will lose access to the member portal.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white cursor-pointer">Cancel</button>
              <button onClick={handleRemove} disabled={mutating} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer">
                {mutating ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
