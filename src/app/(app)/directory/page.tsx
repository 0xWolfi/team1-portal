'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, Search, ArrowLeft, X, MapPin, Twitter, MessageCircle,
  Send, Github, Wallet, Mail, Globe, Shield,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/context/auth-context'
import { getRoleBadgeColor } from '@/lib/helpers'
import Link from 'next/link'

interface MemberUser {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  email?: string
  city: string | null
  country: string | null
  walletAddress: string | null
  discord: string | null
  xHandle: string | null
  telegram: string | null
  github: string | null
  skills: string | null
  interests: string | null
  roles: string | null
  availability: string | null
  socialLinks: string | null
  showEmail: boolean
  showWallet: boolean
  showDiscord: boolean
  showTelegram: boolean
  showXHandle: boolean
  showGithub: boolean
  showCity: boolean
  showBio: boolean
}

interface MemberEntry {
  id: string
  role: string
  user: MemberUser
  region: { name: string; slug: string }
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

export default function DirectoryPage() {
  return <Suspense><DirectoryContent /></Suspense>
}

function DirectoryContent() {
  const searchParams = useSearchParams()
  const region = searchParams.get('region')
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberEntry | null>(null)
  const { isSuperAdmin, isRegionLead } = useAuth()

  const url = `/api/directory${region ? `?region=${region}` : ''}${search ? `${region ? '&' : '?'}search=${search}` : ''}`
  const { data: members, loading } = useApi<MemberEntry[]>(url, [search, region])

  const filtered = members || []

  // Privacy-aware field visibility check
  // Admins and region leads see everything; regular members respect privacy toggles
  const isPrivileged = isSuperAdmin || isRegionLead()
  const canShow = (member: MemberUser, field: keyof MemberUser): boolean => {
    if (isPrivileged) return true
    return !!member[field]
  }

  return (
    <div>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-medium hover:-translate-x-1 duration-200">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/5 rounded-lg border border-white/5">
            <Users size={20} className="text-zinc-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Members Directory</h1>
            <p className="text-sm text-zinc-400">Connect with fellow community members &middot; {filtered.length} members</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-10 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={16} className="text-zinc-500 group-focus-within:text-white transition-colors" />
        </div>
        <input
          className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all hover:bg-zinc-900/80"
          placeholder="Search members by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="py-32 text-center border-2 border-white/5 rounded-[2rem] border-dashed bg-white/5 backdrop-blur-sm flex flex-col items-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center mb-6">
            <Search size={32} className="text-zinc-600" />
          </div>
          <h3 className="text-zinc-200 text-xl font-bold mb-2">No members found</h3>
          <p className="text-zinc-500 max-w-xs mx-auto">
            {search ? `No one matching "${search}".` : 'No members in the directory yet.'}
          </p>
        </div>
      )}

      {/* Members Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const skills = parseJson<string[]>(m.user.skills, [])
            const location = canShow(m.user, 'showCity')
              ? [m.user.city, m.user.country].filter(Boolean).join(', ')
              : ''
            return (
              <div
                key={m.id}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => setSelectedMember(m)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-700/30 to-zinc-800/30 border border-white/10 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {m.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{m.user.displayName}</h3>
                    {m.user.username && (
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono bg-white/5 px-2 py-0.5 rounded">
                        @{m.user.username}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Users size={14} className="text-zinc-600" />
                    <span>{m.region.name}</span>
                  </div>
                  {location && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <MapPin size={14} className="text-zinc-600" />
                      <span>{location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(m.role)}`}>
                      {m.role === 'co_lead' ? 'Co-Lead' : m.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {m.user.availability && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {m.user.availability}
                      </span>
                    )}
                  </div>
                  {canShow(m.user, 'showBio') && m.user.bio && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-2">{m.user.bio}</p>
                  )}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">
                          {s}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 text-zinc-600">+{skills.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Member Profile Slide-out Panel */}
      {selectedMember && (
        <MemberProfilePanel
          member={selectedMember}
          isPrivileged={isPrivileged}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  )
}

// ─── Profile Slide-out Panel ──────────────────────────────────────────────────

function MemberProfilePanel({
  member,
  isPrivileged,
  onClose,
}: {
  member: MemberEntry
  isPrivileged: boolean
  onClose: () => void
}) {
  const u = member.user
  const canShow = (field: keyof MemberUser): boolean => isPrivileged || !!u[field]

  const skills = parseJson<string[]>(u.skills, [])
  const interests = parseJson<string[]>(u.interests, [])
  const roles = parseJson<string[]>(u.roles, [])
  const socialLinks = parseJson<{ name: string; url: string }[]>(u.socialLinks, [])
  const location = canShow('showCity') ? [u.city, u.country].filter(Boolean).join(', ') : ''

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-white/5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-lg font-medium text-white">Member Profile</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + Name */}
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-2xl mx-auto mb-3">
              {u.displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-white">{u.displayName}</h3>
            {u.username && <p className="text-sm text-zinc-400 mt-0.5">@{u.username}</p>}
            {location && (
              <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1 justify-center">
                <MapPin size={12} /> {location}
              </p>
            )}
          </div>

          {/* Role & Region */}
          <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500">Region</span>
              <span className="text-sm text-zinc-300">{member.region.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500">Membership Role</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(member.role)}`}>
                {member.role === 'co_lead' ? 'Co-Lead' : member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            {u.availability && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Availability</span>
                <span className="text-xs text-emerald-400">{u.availability}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {canShow('showBio') && u.bio && (
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 mb-2">About</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{u.bio}</p>
            </div>
          )}

          {/* Roles */}
          {roles.length > 0 && (
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Roles</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span key={role} className="px-3 py-1.5 bg-white/10 border border-white/20 text-white text-sm rounded-lg">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Interests</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span key={interest} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact & Social */}
          <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-3">Contact</p>
            <div className="space-y-2.5">
              {canShow('showEmail') && u.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate">{u.email}</span>
                </div>
              )}
              {canShow('showXHandle') && u.xHandle && (
                <div className="flex items-center gap-3 text-sm">
                  <Twitter size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300">@{u.xHandle}</span>
                </div>
              )}
              {canShow('showDiscord') && u.discord && (
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300">{u.discord}</span>
                </div>
              )}
              {canShow('showTelegram') && u.telegram && (
                <div className="flex items-center gap-3 text-sm">
                  <Send size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300">{u.telegram}</span>
                </div>
              )}
              {canShow('showGithub') && u.github && (
                <div className="flex items-center gap-3 text-sm">
                  <Github size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300">{u.github}</span>
                </div>
              )}
              {canShow('showWallet') && u.walletAddress && (
                <div className="flex items-center gap-3 text-sm">
                  <Wallet size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 font-mono text-xs truncate">{u.walletAddress}</span>
                </div>
              )}
              {socialLinks.filter((l) => l.name && l.url).length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  {socialLinks.filter((l) => l.name && l.url).map((link, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Globe size={14} className="text-zinc-500 shrink-0" />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 truncate">
                        {link.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {/* No contact info at all */}
              {!u.xHandle && !u.discord && !u.telegram && !u.github && !u.walletAddress && socialLinks.length === 0 && (
                <p className="text-sm text-zinc-600">No contact information shared</p>
              )}
            </div>
          </div>

          {/* Admin notice */}
          {isPrivileged && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 flex items-center gap-2.5">
              <Shield size={14} className="text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-500">
                You are viewing the full profile. Some fields may be hidden from regular members.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
