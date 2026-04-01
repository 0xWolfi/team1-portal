'use client'
import { useState, useEffect, useCallback, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil, Save, X, MapPin, Globe, Plus, Trash2,
  MessageCircle, Twitter, Send, Github,
  ArrowLeft, Check, Loader2, Activity, Calendar,
  Link as LinkIcon,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/context/toast-context'
import { api } from '@/lib/api-client'
import { getInitials, getRoleBadgeColor, formatDate } from '@/lib/helpers'
import Link from 'next/link'
import type { PrivacyLevel, MemberActivity } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  '', 'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada',
  'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Czech Republic', 'Denmark',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Finland',
  'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania',
  'Malaysia', 'Mexico', 'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Uganda',
  'UK', 'Ukraine', 'Uruguay', 'USA', 'Uzbekistan', 'Venezuela', 'Vietnam',
]

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Select availability...' },
  { value: 'Open to Hack', label: 'Open to Hack' },
  { value: 'Looking for Co-founder', label: 'Looking for Co-founder' },
  { value: 'Hiring', label: 'Hiring' },
  { value: 'Just Exploring', label: 'Just Exploring' },
  { value: 'Not Available', label: 'Not Available' },
]

const PREDEFINED_INTERESTS = [
  'DeFi', 'NFTs', 'Gaming', 'DAO', 'Infrastructure', 'Social', 'Mobile',
  'Zero Knowledge', 'Consumer', 'AI', 'RWAs', 'Security', 'Analytics',
  'Trading', 'Governance',
]

const ROLE_OPTIONS = [
  'Developer', 'Marketing', 'Business Development', 'Designer',
  'Community Manager', 'Founder', 'Investor', 'Other',
]

const LANGUAGES = [
  'English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian',
  'Russian', 'Turkish', 'Arabic', 'Hindi', 'Chinese', 'Japanese',
  'Korean', 'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Swahili',
  'Dutch', 'Polish', 'Ukrainian', 'Romanian', 'Czech', 'Swedish',
  'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Persian', 'Bengali', 'Urdu', 'Tamil', 'Telugu', 'Filipino',
]

const EVENT_HOSTING_OPTIONS = [
  'Meetup', 'Workshop', 'Hackathon', 'Conference Talk',
  'Twitter Space', 'Discord Event', 'Webinar', 'Study Group',
]

const STUDENT_OPTIONS = [
  { value: '', label: 'Not a student' },
  { value: 'undergrad', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate / PhD' },
  { value: 'bootcamp', label: 'Bootcamp / Self-taught' },
]

const ACTIVITY_TYPES = [
  { value: 'organized_event', label: 'Organized Event' },
  { value: 'attended_event', label: 'Attended Event' },
  { value: 'submitted_pr', label: 'Submitted PR' },
  { value: 'created_content', label: 'Created Content' },
  { value: 'other', label: 'Other' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PrivacySelect({ value, onChange }: { value: PrivacyLevel; onChange: (v: PrivacyLevel) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PrivacyLevel)}
      className="h-8 px-2 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer"
    >
      <option value="public">Public</option>
      <option value="members">Members Only</option>
      <option value="leads_only">Leads Only</option>
    </select>
  )
}

function FieldRow({ label, children, privacy, onPrivacyChange, required }: {
  label: string; children: React.ReactNode; privacy?: PrivacyLevel; onPrivacyChange?: (v: PrivacyLevel) => void; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-zinc-300 font-medium">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {onPrivacyChange && privacy && <PrivacySelect value={privacy} onChange={onPrivacyChange} />}
      </div>
      {children}
    </div>
  )
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      const val = input.trim()
      if (!tags.includes(val)) onChange([...tags, val])
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
  }
  return (
    <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 border border-white/5 rounded-xl min-h-[44px]">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-zinc-500 hover:text-white cursor-pointer"><X size={12} /></button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : 'Type + Enter...'}
      />
    </div>
  )
}

const inputClass = 'w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10'

// ─── Profile form type ───────────────────────────────────────────────────────

interface ProfileForm {
  displayName: string; username: string; bio: string
  country: string; discord: string; xHandle: string
  city: string; state: string
  studentStatus: string; university: string; languages: string[]
  telegram: string; github: string; linkedin: string; instagram: string
  reddit: string; arena: string; youtube: string; tiktok: string
  podcast: string; blog: string; website: string
  walletAddress: string; skills: string[]; interests: string[]; roles: string[]
  availability: string; socialLinks: { name: string; url: string }[]
  eventHostingPrefs: string[]
  cChainAddress: string; developmentGoals: string; shippingAddress: string; merchSizes: string
  privacy: Record<string, PrivacyLevel>
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, refreshUser, isSuperAdmin, isRegionLead } = useAuth()
  const { success, error: showError } = useToast()
  const isLead = isSuperAdmin || isRegionLead()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities'>('overview')

  // Activity modal
  const [actModal, setActModal] = useState(false)
  const [actForm, setActForm] = useState({ type: 'organized_event', title: '', description: '', date: '', link: '' })
  const [actSaving, setActSaving] = useState(false)
  const [activities, setActivities] = useState<MemberActivity[]>([])

  const [form, setForm] = useState<ProfileForm>({
    displayName: '', username: '', bio: '',
    country: '', discord: '', xHandle: '',
    city: '', state: '',
    studentStatus: '', university: '', languages: [],
    telegram: '', github: '', linkedin: '', instagram: '',
    reddit: '', arena: '', youtube: '', tiktok: '',
    podcast: '', blog: '', website: '',
    walletAddress: '', skills: [], interests: [], roles: [],
    availability: '', socialLinks: [], eventHostingPrefs: [],
    cChainAddress: '', developmentGoals: '', shippingAddress: '', merchSizes: '',
    privacy: {},
  })

  const populateForm = useCallback(() => {
    if (!user) return
    setForm({
      displayName: user.displayName || '', username: user.username || '', bio: user.bio || '',
      country: user.country || '', discord: user.discord || '', xHandle: user.xHandle || '',
      city: user.city || '', state: (user as any).state || '',
      studentStatus: (user as any).studentStatus || '', university: (user as any).university || '',
      languages: parseJson<string[]>((user as any).languages, []),
      telegram: user.telegram || '', github: user.github || '',
      linkedin: (user as any).linkedin || '', instagram: (user as any).instagram || '',
      reddit: (user as any).reddit || '', arena: (user as any).arena || '',
      youtube: (user as any).youtube || '', tiktok: (user as any).tiktok || '',
      podcast: (user as any).podcast || '', blog: (user as any).blog || '',
      website: (user as any).website || '',
      walletAddress: user.walletAddress || '', skills: parseJson<string[]>(user.skills, []),
      interests: parseJson<string[]>(user.interests, []), roles: parseJson<string[]>(user.roles, []),
      availability: user.availability || '', socialLinks: parseJson<{ name: string; url: string }[]>(user.socialLinks, []),
      eventHostingPrefs: parseJson<string[]>((user as any).eventHostingPrefs, []),
      cChainAddress: (user as any).cChainAddress || '', developmentGoals: (user as any).developmentGoals || '',
      shippingAddress: (user as any).shippingAddress || '', merchSizes: (user as any).merchSizes || '',
      privacy: parseJson<Record<string, PrivacyLevel>>((user as any).privacySettings, {}),
    })
    setActivities((user as any).activities || [])
    setLoading(false)
  }, [user])

  useEffect(() => { populateForm() }, [populateForm])

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const getPrivacy = (field: string, fallback: PrivacyLevel = 'members'): PrivacyLevel => form.privacy[field] || fallback
  const setPrivacy = (field: string, value: PrivacyLevel) => updateField('privacy', { ...form.privacy, [field]: value })

  const handleSave = async () => {
    if (!form.displayName.trim()) { showError('Display name is required'); return }
    if (!form.country) { showError('Country is required'); return }
    if (!form.discord.trim()) { showError('Discord handle is required'); return }
    if (!form.xHandle.trim()) { showError('X handle is required'); return }

    setSaving(true)
    const payload = {
      ...form,
      skills: JSON.stringify(form.skills), interests: JSON.stringify(form.interests),
      roles: JSON.stringify(form.roles), socialLinks: JSON.stringify(form.socialLinks),
      languages: JSON.stringify(form.languages), eventHostingPrefs: JSON.stringify(form.eventHostingPrefs),
      privacySettings: JSON.stringify(form.privacy),
    }
    const res = await api.put('/api/auth/me', payload)
    if (res.success) { await refreshUser(); success('Profile updated!'); setEditing(false) }
    else showError(res.error || 'Failed to update')
    setSaving(false)
  }

  const handleAddActivity = async () => {
    if (!actForm.title || !actForm.date) { showError('Title and date are required'); return }
    setActSaving(true)
    const res = await api.post<MemberActivity>('/api/activities', actForm)
    if (res.success && res.data) {
      setActivities([res.data, ...activities])
      setActModal(false)
      setActForm({ type: 'organized_event', title: '', description: '', date: '', link: '' })
      success('Activity added!')
    } else showError(res.error || 'Failed')
    setActSaving(false)
  }

  const handleDeleteActivity = async (id: string) => {
    const res = await api.del(`/api/activities?id=${id}`)
    if (res.success) { setActivities(activities.filter((a) => a.id !== id)); success('Deleted') }
    else showError(res.error || 'Failed')
  }

  const membershipRole = user?.memberships?.[0]?.role || 'member'

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-medium hover:-translate-x-1 duration-200">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <AnimatePresence mode="wait">
        {!editing ? (
          /* ═══ VIEW MODE ═══ */
          <motion.div key="view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
            {/* Header */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-2xl shrink-0">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(form.displayName || 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{form.displayName}</h1>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${getRoleBadgeColor(membershipRole)}`}>
                      {membershipRole === 'co_lead' ? 'Co-Lead' : membershipRole.replace('_', ' ')}
                    </span>
                  </div>
                  {form.username && <p className="text-sm text-zinc-500 mt-1 font-mono">@{form.username}</p>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-zinc-400">
                    {form.country && <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-zinc-500" />{form.city ? `${form.city}, ` : ''}{form.country}</span>}
                    {form.xHandle && <span className="inline-flex items-center gap-1"><Twitter size={13} />@{form.xHandle}</span>}
                    {form.discord && <span className="inline-flex items-center gap-1"><MessageCircle size={13} />{form.discord}</span>}
                  </div>
                </div>
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm cursor-pointer shrink-0">
                  <Pencil size={14} /> Edit Profile
                </button>
              </div>
              {form.bio && <div className="mt-6 pt-6 border-t border-white/5"><p className="text-sm text-zinc-300 leading-relaxed">{form.bio}</p></div>}
            </div>

            {/* Tabs */}
            <div className="border-b border-white/5">
              <div className="flex gap-6">
                <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-bold cursor-pointer ${activeTab === 'overview' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}>OVERVIEW</button>
                <button onClick={() => setActiveTab('activities')} className={`pb-3 text-sm font-bold cursor-pointer ${activeTab === 'activities' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}>ACTIVITIES</button>
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Skills */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Skills</h3>
                    {form.skills.length > 0 ? <div className="flex flex-wrap gap-2">{form.skills.map((s) => <span key={s} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">{s}</span>)}</div> : <p className="text-sm text-zinc-600">No skills added</p>}
                  </div>
                  {/* Interests */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Interests</h3>
                    {form.interests.length > 0 ? <div className="flex flex-wrap gap-2">{form.interests.map((i) => <span key={i} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">{i}</span>)}</div> : <p className="text-sm text-zinc-600">No interests added</p>}
                  </div>
                  {/* Languages */}
                  {form.languages.length > 0 && (
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Languages</h3>
                      <div className="flex flex-wrap gap-2">{form.languages.map((l) => <span key={l} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">{l}</span>)}</div>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  {/* Roles */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Roles</h3>
                    {form.roles.length > 0 ? <div className="flex flex-wrap gap-2">{form.roles.map((r) => <span key={r} className="px-3 py-1.5 bg-white/10 border border-white/20 text-white text-sm rounded-lg">{r}</span>)}</div> : <p className="text-sm text-zinc-600">No roles selected</p>}
                  </div>
                  {/* Contact */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Contact</h3>
                    <div className="space-y-2.5 text-sm">
                      {form.telegram && <div className="flex items-center gap-3"><Send size={14} className="text-zinc-500" /><span className="text-zinc-300">{form.telegram}</span></div>}
                      {form.github && <div className="flex items-center gap-3"><Github size={14} className="text-zinc-500" /><span className="text-zinc-300">{form.github}</span></div>}
                      {form.linkedin && <div className="flex items-center gap-3"><Globe size={14} className="text-zinc-500" /><span className="text-zinc-300">LinkedIn: {form.linkedin}</span></div>}
                      {form.website && <div className="flex items-center gap-3"><Globe size={14} className="text-zinc-500" /><span className="text-zinc-300">{form.website}</span></div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Activity Log</h3>
                  <button onClick={() => setActModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer">
                    <Plus size={14} /> Add Activity
                  </button>
                </div>
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((a) => (
                      <div key={a.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                          <Activity size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{a.title}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">{ACTIVITY_TYPES.find((t) => t.value === a.type)?.label || a.type}</span>
                          </div>
                          {a.description && <p className="text-xs text-zinc-500">{a.description}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
                            <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(a.date)}</span>
                            {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-400 hover:text-red-300"><LinkIcon size={10} />Link</a>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteActivity(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-white/5 rounded-[2rem] border-dashed bg-white/5">
                    <Activity size={32} className="mx-auto text-zinc-600 mb-3" />
                    <h3 className="text-zinc-200 font-bold mb-1">No activities yet</h3>
                    <p className="text-zinc-500 text-sm">Log your contributions — events, PRs, content, and more.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          /* ═══ EDIT MODE ═══ */
          <motion.div key="edit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Pencil size={18} className="text-zinc-200" /></div>
                <div><h1 className="text-xl font-bold text-white">Edit Profile</h1><p className="text-xs text-zinc-500">Fields marked * are required. Set visibility per field.</p></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { populateForm(); setEditing(false) }} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-white/5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><X size={14} />Cancel</button>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Section 1: Basic Info */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Basic Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Display Name" required><input className={inputClass} value={form.displayName} onChange={(e) => updateField('displayName', e.target.value)} placeholder="Your name" /></FieldRow>
                <FieldRow label="Username">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                    <input className={`${inputClass} pl-8`} value={form.username} onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="username" />
                  </div>
                </FieldRow>
              </div>
              <FieldRow label="About Me" privacy={getPrivacy('bio')} onPrivacyChange={(v) => setPrivacy('bio', v)}>
                <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder="Tell others about yourself..." />
              </FieldRow>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Country" required>
                  <select className={`${inputClass} appearance-none cursor-pointer`} value={form.country} onChange={(e) => updateField('country', e.target.value)}>
                    <option value="">Select country...</option>
                    {COUNTRIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="City" privacy={getPrivacy('city')} onPrivacyChange={(v) => setPrivacy('city', v)}>
                  <input className={inputClass} value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="City" />
                </FieldRow>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="State / Province / Region" privacy={getPrivacy('state')} onPrivacyChange={(v) => setPrivacy('state', v)}>
                  <input className={inputClass} value={form.state} onChange={(e) => updateField('state', e.target.value)} placeholder="State or province" />
                </FieldRow>
                <FieldRow label="Availability"><select className={`${inputClass} appearance-none cursor-pointer`} value={form.availability} onChange={(e) => updateField('availability', e.target.value)}>{AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FieldRow>
              </div>
            </div>

            {/* Section 2: Required Social (always public) */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Required Fields</h2>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">Always Visible</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Discord Handle" required><input className={inputClass} value={form.discord} onChange={(e) => updateField('discord', e.target.value)} placeholder="username#0000" /></FieldRow>
                <FieldRow label="X (Twitter) Handle" required><input className={inputClass} value={form.xHandle} onChange={(e) => updateField('xHandle', e.target.value)} placeholder="handle (without @)" /></FieldRow>
              </div>
            </div>

            {/* Section 3: Optional Social & Contact */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Social & Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Telegram" privacy={getPrivacy('telegram')} onPrivacyChange={(v) => setPrivacy('telegram', v)}><input className={inputClass} value={form.telegram} onChange={(e) => updateField('telegram', e.target.value)} placeholder="username" /></FieldRow>
                <FieldRow label="Email" privacy={getPrivacy('email', 'leads_only')} onPrivacyChange={(v) => setPrivacy('email', v)}><input className={inputClass} value={user?.email || ''} disabled placeholder="From your account" /></FieldRow>
                <FieldRow label="GitHub" privacy={getPrivacy('github')} onPrivacyChange={(v) => setPrivacy('github', v)}><input className={inputClass} value={form.github} onChange={(e) => updateField('github', e.target.value)} placeholder="username" /></FieldRow>
                <FieldRow label="LinkedIn" privacy={getPrivacy('linkedin')} onPrivacyChange={(v) => setPrivacy('linkedin', v)}><input className={inputClass} value={form.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="Profile URL or username" /></FieldRow>
                <FieldRow label="Instagram" privacy={getPrivacy('instagram')} onPrivacyChange={(v) => setPrivacy('instagram', v)}><input className={inputClass} value={form.instagram} onChange={(e) => updateField('instagram', e.target.value)} placeholder="@handle" /></FieldRow>
                <FieldRow label="Reddit" privacy={getPrivacy('reddit')} onPrivacyChange={(v) => setPrivacy('reddit', v)}><input className={inputClass} value={form.reddit} onChange={(e) => updateField('reddit', e.target.value)} placeholder="u/username" /></FieldRow>
                <FieldRow label="Arena" privacy={getPrivacy('arena')} onPrivacyChange={(v) => setPrivacy('arena', v)}><input className={inputClass} value={form.arena} onChange={(e) => updateField('arena', e.target.value)} placeholder="Arena handle" /></FieldRow>
                <FieldRow label="YouTube" privacy={getPrivacy('youtube')} onPrivacyChange={(v) => setPrivacy('youtube', v)}><input className={inputClass} value={form.youtube} onChange={(e) => updateField('youtube', e.target.value)} placeholder="Channel URL" /></FieldRow>
                <FieldRow label="TikTok" privacy={getPrivacy('tiktok')} onPrivacyChange={(v) => setPrivacy('tiktok', v)}><input className={inputClass} value={form.tiktok} onChange={(e) => updateField('tiktok', e.target.value)} placeholder="@handle" /></FieldRow>
                <FieldRow label="Podcast" privacy={getPrivacy('podcast')} onPrivacyChange={(v) => setPrivacy('podcast', v)}><input className={inputClass} value={form.podcast} onChange={(e) => updateField('podcast', e.target.value)} placeholder="Podcast URL" /></FieldRow>
                <FieldRow label="Blog" privacy={getPrivacy('blog')} onPrivacyChange={(v) => setPrivacy('blog', v)}><input className={inputClass} value={form.blog} onChange={(e) => updateField('blog', e.target.value)} placeholder="Blog URL" /></FieldRow>
                <FieldRow label="Website" privacy={getPrivacy('website')} onPrivacyChange={(v) => setPrivacy('website', v)}><input className={inputClass} value={form.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://..." /></FieldRow>
              </div>
              {/* Custom social links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between"><label className="text-sm text-zinc-300 font-medium">Custom Links</label><button type="button" onClick={() => updateField('socialLinks', [...form.socialLinks, { name: '', url: '' }])} className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer"><Plus size={12} /> Add</button></div>
                {form.socialLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10" value={link.name} onChange={(e) => { const u = [...form.socialLinks]; u[i] = { ...u[i], name: e.target.value }; updateField('socialLinks', u) }} placeholder="Label" />
                    <input className="flex-[2] bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10" value={link.url} onChange={(e) => { const u = [...form.socialLinks]; u[i] = { ...u[i], url: e.target.value }; updateField('socialLinks', u) }} placeholder="https://..." />
                    <button type="button" onClick={() => updateField('socialLinks', form.socialLinks.filter((_, j) => j !== i))} className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Education & Languages */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Education & Languages</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Student Status" privacy={getPrivacy('studentStatus')} onPrivacyChange={(v) => setPrivacy('studentStatus', v)}>
                  <select className={`${inputClass} appearance-none cursor-pointer`} value={form.studentStatus} onChange={(e) => updateField('studentStatus', e.target.value)}>{STUDENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                </FieldRow>
                <FieldRow label="University Affiliation" privacy={getPrivacy('university')} onPrivacyChange={(v) => setPrivacy('university', v)}>
                  <input className={inputClass} value={form.university} onChange={(e) => updateField('university', e.target.value)} placeholder="University name" />
                </FieldRow>
              </div>
              <FieldRow label="Languages Spoken" privacy={getPrivacy('languages')} onPrivacyChange={(v) => setPrivacy('languages', v)}>
                <div className="flex flex-wrap gap-2">{LANGUAGES.map((lang) => (
                  <button key={lang} type="button" onClick={() => updateField('languages', form.languages.includes(lang) ? form.languages.filter((l) => l !== lang) : [...form.languages, lang])}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${form.languages.includes(lang) ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                    {form.languages.includes(lang) && <Check size={10} className="inline mr-1" />}{lang}
                  </button>
                ))}</div>
              </FieldRow>
            </div>

            {/* Section 5: Skills, Interests, Roles, Event Hosting */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Skills & Interests</h2>
              <FieldRow label="Skills" privacy={getPrivacy('skills')} onPrivacyChange={(v) => setPrivacy('skills', v)}>
                <p className="text-xs text-zinc-600 mb-2">Type a skill and press Enter</p>
                <TagInput tags={form.skills} onChange={(t) => updateField('skills', t)} placeholder="e.g. Solidity, React, Rust..." />
              </FieldRow>
              <FieldRow label="Interests" privacy={getPrivacy('interests')} onPrivacyChange={(v) => setPrivacy('interests', v)}>
                <div className="flex flex-wrap gap-2">{PREDEFINED_INTERESTS.map((i) => (
                  <button key={i} type="button" onClick={() => updateField('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i])}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${form.interests.includes(i) ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'}`}>
                    {form.interests.includes(i) && <Check size={12} className="inline mr-1.5" />}{i}
                  </button>
                ))}</div>
              </FieldRow>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><label className="text-sm text-zinc-300 font-medium">Roles</label><span className="text-xs text-zinc-600">Select up to 3</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{ROLE_OPTIONS.map((r) => (
                  <button key={r} type="button" onClick={() => { if (form.roles.includes(r)) updateField('roles', form.roles.filter((x) => x !== r)); else if (form.roles.length < 3) updateField('roles', [...form.roles, r]) }}
                    disabled={!form.roles.includes(r) && form.roles.length >= 3}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer text-center ${form.roles.includes(r) ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'} ${!form.roles.includes(r) && form.roles.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {form.roles.includes(r) && <Check size={12} className="inline mr-1" />}{r}
                  </button>
                ))}</div>
              </div>
              <FieldRow label="Event Hosting Preferences" privacy={getPrivacy('eventHostingPrefs')} onPrivacyChange={(v) => setPrivacy('eventHostingPrefs', v)}>
                <div className="flex flex-wrap gap-2">{EVENT_HOSTING_OPTIONS.map((o) => (
                  <button key={o} type="button" onClick={() => updateField('eventHostingPrefs', form.eventHostingPrefs.includes(o) ? form.eventHostingPrefs.filter((x) => x !== o) : [...form.eventHostingPrefs, o])}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${form.eventHostingPrefs.includes(o) ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'}`}>
                    {form.eventHostingPrefs.includes(o) && <Check size={12} className="inline mr-1.5" />}{o}
                  </button>
                ))}</div>
              </FieldRow>
            </div>

            {/* Section 6: Lead-Only Fields */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Lead-Only Fields</h2>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">Visible to Global/Region Leads Only</span>
              </div>
              <p className="text-xs text-zinc-600 -mt-2">These fields are only visible to your region leads and global admins.</p>
              <FieldRow label="C-Chain Address"><input className={`${inputClass} font-mono text-xs`} value={form.cChainAddress} onChange={(e) => updateField('cChainAddress', e.target.value)} placeholder="0x..." /></FieldRow>
              <FieldRow label="Development Goals"><textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.developmentGoals} onChange={(e) => updateField('developmentGoals', e.target.value)} placeholder="What are you working towards?" /></FieldRow>
              <FieldRow label="Shipping Address"><textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.shippingAddress} onChange={(e) => updateField('shippingAddress', e.target.value)} placeholder="For merch shipments" /></FieldRow>
              <FieldRow label="Merch Sizes"><input className={inputClass} value={form.merchSizes} onChange={(e) => updateField('merchSizes', e.target.value)} placeholder='e.g. T-Shirt: L, Hoodie: XL' /></FieldRow>
            </div>

            {/* Bottom Save */}
            <div className="flex items-center justify-end gap-3 pb-8">
              <button onClick={() => { populateForm(); setEditing(false) }} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white border border-white/5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      {actModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-medium text-white">Add Activity</h2>
              <button onClick={() => setActModal(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-300 font-medium">Type</label>
                <select className={`${inputClass} appearance-none cursor-pointer`} value={actForm.type} onChange={(e) => setActForm({ ...actForm, type: e.target.value })}>{ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              </div>
              <div className="space-y-1.5"><label className="block text-sm text-zinc-300 font-medium">Title *</label><input className={inputClass} value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} placeholder="What did you do?" /></div>
              <div className="space-y-1.5"><label className="block text-sm text-zinc-300 font-medium">Description</label><textarea className={`${inputClass} min-h-[60px] resize-y`} value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} placeholder="Optional details" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="block text-sm text-zinc-300 font-medium">Date *</label><input type="date" className={inputClass} value={actForm.date} onChange={(e) => setActForm({ ...actForm, date: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="block text-sm text-zinc-300 font-medium">Link</label><input className={inputClass} value={actForm.link} onChange={(e) => setActForm({ ...actForm, link: e.target.value })} placeholder="https://..." /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setActModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white cursor-pointer">Cancel</button>
                <button onClick={handleAddActivity} disabled={actSaving} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer">{actSaving ? 'Adding...' : 'Add Activity'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
