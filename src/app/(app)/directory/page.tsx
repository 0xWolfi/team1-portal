'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, Search, ArrowLeft, X, MapPin, Twitter, MessageCircle,
  Send, Github, Globe,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/context/auth-context'
import { getRoleBadgeColor } from '@/lib/helpers'
import { SocialLink } from '@/components/profile/social-link'
import type { SocialPlatform } from '@/lib/socials'
import Link from 'next/link'
import type { PrivacyLevel } from '@/types'

interface MemberUser {
  id: string; displayName: string; username: string | null; avatarUrl: string | null
  bio: string | null; email?: string; country: string | null; city: string | null; state: string | null
  discord: string | null; xHandle: string | null; telegram: string | null; github: string | null
  linkedin: string | null; instagram: string | null; reddit: string | null; arena: string | null
  youtube: string | null; tiktok: string | null; twitch: string | null; farcaster: string | null
  linktree: string | null; buildersHub: string | null
  podcast: string | null; blog: string | null; website: string | null
  walletAddress: string | null; skills: string | null; interests: string | null; roles: string | null
  availability: string | null; availabilityHours: number | null; socialLinks: string | null; languages: string | null
  studentStatus: string | null; university: string | null; eventHostingPrefs: string | null
  cChainAddress: string | null; developmentGoals: string | null; shippingAddress: string | null; merchSizes: string | null
  privacySettings: string | null
}

interface MemberEntry {
  id: string; role: string; user: MemberUser; region: { name: string; slug: string }
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

function parseAvailabilityArr(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
    return []
  } catch {
    return [val]
  }
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

  // Viewer's access level
  const isLead = isSuperAdmin || isRegionLead()

  // 3-tier privacy check
  const canSee = (member: MemberUser, field: string): boolean => {
    // Leads see everything
    if (isLead) return true
    // Required fields always visible
    if (['country', 'discord', 'xHandle'].includes(field)) return true
    // Lead-only fields never visible to regular members
    if (['cChainAddress', 'developmentGoals', 'shippingAddress', 'merchSizes'].includes(field)) return false

    const privacy = parseJson<Record<string, PrivacyLevel>>(member.privacySettings, {})
    const level = privacy[field] || 'members'
    if (level === 'public') return true
    if (level === 'members') return true // viewer is logged in = is a member
    return false // leads_only
  }

  return (
    <div>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8 text-sm font-medium hover:-translate-x-1 duration-200">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 rounded-lg"><Users size={20} className="text-zinc-700 dark:text-zinc-200" /></div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Members Directory</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Connect with fellow community members &middot; {filtered.length} members</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-10 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={16} className="text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
        </div>
        <input
          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:border-white/5 dark:hover:bg-zinc-900/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/10 transition-all"
          placeholder="Search members by name..." value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/5 animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-32 text-center border-2 border-zinc-200 dark:border-white/5 rounded-4xl border-dashed bg-white dark:bg-white/5 backdrop-blur-sm flex flex-col items-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 dark:bg-black dark:border-white/10 flex items-center justify-center mb-6"><Search size={32} className="text-zinc-400 dark:text-zinc-600" /></div>
          <h3 className="text-zinc-900 dark:text-zinc-200 text-xl font-bold mb-2">No members found</h3>
          <p className="text-zinc-500 max-w-xs mx-auto">{search ? `No one matching "${search}".` : 'No members in the directory yet.'}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const skills = parseJson<string[]>(m.user.skills, [])
            const availabilityList = parseAvailabilityArr(m.user.availability)
            const location = canSee(m.user, 'city') ? [m.user.city, m.user.country].filter(Boolean).join(', ') : (m.user.country || '')
            return (
              <div key={m.id} className="group p-6 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:border-white/5 dark:hover:border-white/20 dark:hover:bg-white/5 transition-all cursor-pointer" onClick={() => setSelectedMember(m)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 border border-zinc-300 text-zinc-900 dark:from-zinc-700/30 dark:to-zinc-800/30 dark:border-white/10 dark:text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                    {m.user.avatarUrl ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{m.user.displayName}</h3>
                    {m.user.username && <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">@{m.user.username}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Users size={14} className="text-zinc-400 dark:text-zinc-600" /><span>{m.region.name}</span></div>
                  {location && <div className="flex items-center gap-2 text-sm text-zinc-500"><MapPin size={14} className="text-zinc-400 dark:text-zinc-600" /><span>{location}</span></div>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(m.role)}`}>{m.role === 'co_lead' ? 'Co-Lead' : m.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    {availabilityList.slice(0, 2).map((a) => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400">{a}</span>
                    ))}
                    {availabilityList.length > 2 && <span className="text-[10px] px-2 py-0.5 text-zinc-500 dark:text-zinc-600">+{availabilityList.length - 2}</span>}
                    {m.user.availabilityHours != null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400">{m.user.availabilityHours} hrs/wk</span>}
                  </div>
                  {canSee(m.user, 'bio') && m.user.bio && <p className="text-xs text-zinc-600 dark:text-zinc-500 line-clamp-2 mt-2">{m.user.bio}</p>}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skills.slice(0, 3).map((s) => <span key={s} className="text-[10px] px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 rounded">{s}</span>)}
                      {skills.length > 3 && <span className="text-[10px] px-2 py-0.5 text-zinc-500 dark:text-zinc-600">+{skills.length - 3}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedMember && <MemberProfilePanel member={selectedMember} isLead={isLead} canSee={canSee} onClose={() => setSelectedMember(null)} />}
    </div>
  )
}

// ─── Profile Slide-out ──────────────────────────────────────────────────

function MemberProfilePanel({ member, isLead, canSee, onClose }: {
  member: MemberEntry; isLead: boolean; canSee: (u: MemberUser, f: string) => boolean; onClose: () => void
}) {
  const u = member.user
  const skills = parseJson<string[]>(u.skills, [])
  const interests = parseJson<string[]>(u.interests, [])
  const roles = parseJson<string[]>(u.roles, [])
  const languages = parseJson<string[]>(u.languages, [])
  const availabilityList = parseAvailabilityArr(u.availability)
  const socialLinks = parseJson<{ name: string; url: string }[]>(u.socialLinks, [])
  const location = [canSee(u, 'city') ? u.city : null, canSee(u, 'state') ? u.state : null, u.country].filter(Boolean).join(', ')

  const SocialRow = ({ icon, platform, value, field }: { icon: React.ReactNode; platform: SocialPlatform; value: string | null; field: string }) => {
    if (!value || !canSee(u, field)) return null
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="shrink-0">{icon}</span>
        <SocialLink platform={platform} handle={value} showLabel className="text-sm" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-70 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border-l border-zinc-200 dark:bg-zinc-900 dark:border-white/5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Member Profile</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + Name */}
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-red-100 to-red-50 border border-red-200 text-red-700 dark:from-red-500/20 dark:to-red-600/10 dark:border-red-500/20 dark:text-red-400 flex items-center justify-center font-bold text-2xl mx-auto mb-3 overflow-hidden">
              {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{u.displayName}</h3>
            {u.username && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">@{u.username}</p>}
            {location && <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1 justify-center"><MapPin size={12} /> {location}</p>}
          </div>

          {/* Role & Region */}
          <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/50 dark:border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">Region</span><span className="text-sm text-zinc-700 dark:text-zinc-300">{member.region.name}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">Role</span><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(member.role)}`}>{member.role === 'co_lead' ? 'Co-Lead' : member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></div>
            {(availabilityList.length > 0 || u.availabilityHours != null) && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-zinc-500 shrink-0 pt-1">Availability</span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {availabilityList.map((a) => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">{a}</span>
                  ))}
                  {u.availabilityHours != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">{u.availabilityHours} hrs/wk</span>
                  )}
                </div>
              </div>
            )}
            {canSee(u, 'studentStatus') && u.studentStatus && <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">Student</span><span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{u.studentStatus}</span></div>}
            {canSee(u, 'university') && u.university && <div className="flex justify-between items-center"><span className="text-xs text-zinc-500">University</span><span className="text-sm text-zinc-700 dark:text-zinc-300">{u.university}</span></div>}
          </div>

          {/* Bio */}
          {canSee(u, 'bio') && u.bio && (
            <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/50 dark:border-white/5 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 mb-2">About</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{u.bio}</p>
            </div>
          )}

          {/* Skills, Interests, Languages */}
          {skills.length > 0 && <TagBlock title="Skills" items={skills} />}
          {interests.length > 0 && <TagBlock title="Interests" items={interests} />}
          {roles.length > 0 && <TagBlock title="Roles" items={roles} highlight />}
          {languages.length > 0 && canSee(u, 'languages') && <TagBlock title="Languages" items={languages} />}

          {/* Contact */}
          <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/50 dark:border-white/5 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-3">Contact & Social</p>
            <div className="space-y-2.5">
              {/* Always visible */}
              {u.xHandle && (
                <div className="flex items-center gap-3 text-sm">
                  <Twitter size={14} className="text-zinc-500 shrink-0" />
                  <SocialLink platform="x" handle={u.xHandle} />
                </div>
              )}
              {u.discord && (
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle size={14} className="text-zinc-500 shrink-0" />
                  <SocialLink platform="discord" handle={u.discord} />
                </div>
              )}
              {/* Privacy-gated */}
              <SocialRow icon={<Send size={14} className="text-zinc-500 shrink-0" />} platform="telegram" value={u.telegram} field="telegram" />
              <SocialRow icon={<Github size={14} className="text-zinc-500 shrink-0" />} platform="github" value={u.github} field="github" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="linkedin" value={u.linkedin} field="linkedin" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="instagram" value={u.instagram} field="instagram" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="website" value={u.website} field="website" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="youtube" value={u.youtube} field="youtube" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="reddit" value={u.reddit} field="reddit" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="tiktok" value={u.tiktok} field="tiktok" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="twitch" value={u.twitch} field="twitch" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="farcaster" value={u.farcaster} field="farcaster" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="linktree" value={u.linktree} field="linktree" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="podcast" value={u.podcast} field="podcast" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="blog" value={u.blog} field="blog" />
              <SocialRow icon={<Globe size={14} className="text-zinc-500 shrink-0" />} platform="buildersHub" value={u.buildersHub} field="buildersHub" />
              {canSee(u, 'email') && u.email && <div className="flex items-center gap-3 text-sm"><Globe size={14} className="text-zinc-500 shrink-0" /><a href={`mailto:${u.email}`} className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400 hover:underline underline-offset-2 transition-colors break-all">{u.email}</a></div>}
              {socialLinks.filter(l => l.name && l.url && /^https?:\/\//i.test(l.url)).map((link, i) => (
                <div key={i} className="flex items-center gap-3 text-sm"><Globe size={14} className="text-zinc-500 shrink-0" /><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 truncate">{link.name}</a></div>
              ))}
            </div>
          </div>

          {/* Lead-only fields */}
          {isLead && (u.cChainAddress || u.developmentGoals || u.shippingAddress || u.merchSizes) && (
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/20 rounded-2xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-3">Lead-Only Information</p>
              <div className="space-y-2.5 text-sm">
                {u.cChainAddress && <div><span className="text-xs text-zinc-500">C-Chain:</span> <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs break-all">{u.cChainAddress}</span></div>}
                {u.developmentGoals && <div><span className="text-xs text-zinc-500">Dev Goals:</span> <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">{u.developmentGoals}</p></div>}
                {u.shippingAddress && <div><span className="text-xs text-zinc-500">Shipping:</span> <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">{u.shippingAddress}</p></div>}
                {u.merchSizes && <div><span className="text-xs text-zinc-500">Merch Sizes:</span> <span className="text-zinc-700 dark:text-zinc-300">{u.merchSizes}</span></div>}
              </div>
            </div>
          )}

          {isLead && (
            <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-2.5">
              <p className="text-xs text-zinc-500">You are viewing the full profile as a lead. Some fields may be hidden from regular members.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TagBlock({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/50 dark:border-white/5 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`px-3 py-1.5 text-sm rounded-lg ${highlight ? 'bg-zinc-200 border border-zinc-300 text-zinc-900 dark:bg-white/10 dark:border-white/20 dark:text-white' : 'bg-white border border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'}`}>{item}</span>
        ))}
      </div>
    </div>
  )
}
