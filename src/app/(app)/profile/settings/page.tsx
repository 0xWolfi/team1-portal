'use client'
import { useState, useEffect, useCallback, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Pencil, Save, X, MapPin, Shield, Globe, Plus, Trash2,
  MessageCircle, Twitter, Send, Github, Wallet, Mail, Eye, EyeOff,
  ChevronDown, ArrowLeft, Check, Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/context/toast-context'
import { api } from '@/lib/api-client'
import { getInitials, getRoleBadgeColor } from '@/lib/helpers'
import Link from 'next/link'

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

// ─── Helper: parse JSON string safely ─────────────────────────────────────────

function parseJsonString<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try {
    return JSON.parse(val) as T
  } catch {
    return fallback
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialLink {
  name: string
  url: string
}

interface ProfileForm {
  displayName: string
  username: string
  bio: string
  city: string
  country: string
  walletAddress: string
  discord: string
  xHandle: string
  telegram: string
  github: string
  skills: string[]
  interests: string[]
  roles: string[]
  availability: string
  socialLinks: SocialLink[]
  showEmail: boolean
  showWallet: boolean
  showDiscord: boolean
  showTelegram: boolean
  showXHandle: boolean
  showGithub: boolean
  showCity: boolean
  showBio: boolean
}

// ─── Toggle Switch Component ──────────────────────────────────────────────────

function ToggleSwitch({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
          enabled ? 'bg-red-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Tag Input Component ──────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      const val = input.trim()
      if (!tags.includes(val)) {
        onChange([...tags, val])
      }
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 border border-white/5 rounded-xl min-h-[44px]">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-zinc-500 hover:text-white cursor-pointer">
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : 'Type + Enter...'}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, refreshUser, isSuperAdmin, isRegionLead } = useAuth()
  const { success, error: showError } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customInterest, setCustomInterest] = useState('')

  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    username: '',
    bio: '',
    city: '',
    country: '',
    walletAddress: '',
    discord: '',
    xHandle: '',
    telegram: '',
    github: '',
    skills: [],
    interests: [],
    roles: [],
    availability: '',
    socialLinks: [],
    showEmail: false,
    showWallet: false,
    showDiscord: true,
    showTelegram: true,
    showXHandle: true,
    showGithub: true,
    showCity: true,
    showBio: true,
  })

  // Populate form from user data
  const populateForm = useCallback(() => {
    if (!user) return
    setForm({
      displayName: user.displayName || '',
      username: user.username || '',
      bio: user.bio || '',
      city: user.city || '',
      country: user.country || '',
      walletAddress: user.walletAddress || '',
      discord: user.discord || '',
      xHandle: user.xHandle || '',
      telegram: user.telegram || '',
      github: user.github || '',
      skills: parseJsonString<string[]>(user.skills, []),
      interests: parseJsonString<string[]>(user.interests, []),
      roles: parseJsonString<string[]>(user.roles, []),
      availability: user.availability || '',
      socialLinks: parseJsonString<SocialLink[]>(user.socialLinks, []),
      showEmail: user.showEmail ?? false,
      showWallet: user.showWallet ?? false,
      showDiscord: user.showDiscord ?? true,
      showTelegram: user.showTelegram ?? true,
      showXHandle: user.showXHandle ?? true,
      showGithub: user.showGithub ?? true,
      showCity: user.showCity ?? true,
      showBio: user.showBio ?? true,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    populateForm()
  }, [populateForm])

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      showError('Display name is required')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      skills: JSON.stringify(form.skills),
      interests: JSON.stringify(form.interests),
      roles: JSON.stringify(form.roles),
      socialLinks: JSON.stringify(form.socialLinks),
    }
    const res = await api.put('/api/auth/me', payload)
    if (res.success) {
      await refreshUser()
      success('Profile updated successfully!')
      setEditing(false)
    } else {
      showError(res.error || 'Failed to update profile')
    }
    setSaving(false)
  }

  const handleCancel = () => {
    populateForm()
    setEditing(false)
  }

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleInterest = (interest: string) => {
    if (form.interests.includes(interest)) {
      updateField('interests', form.interests.filter((i) => i !== interest))
    } else {
      updateField('interests', [...form.interests, interest])
    }
  }

  const toggleRole = (role: string) => {
    if (form.roles.includes(role)) {
      updateField('roles', form.roles.filter((r) => r !== role))
    } else if (form.roles.length < 3) {
      updateField('roles', [...form.roles, role])
    }
  }

  const addSocialLink = () => {
    updateField('socialLinks', [...form.socialLinks, { name: '', url: '' }])
  }

  const updateSocialLink = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...form.socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    updateField('socialLinks', updated)
  }

  const removeSocialLink = (index: number) => {
    updateField('socialLinks', form.socialLinks.filter((_, i) => i !== index))
  }

  const addCustomInterest = () => {
    const val = customInterest.trim()
    if (val && !form.interests.includes(val)) {
      updateField('interests', [...form.interests, val])
      setCustomInterest('')
    }
  }

  // Get primary membership role label
  const membershipRole = user?.memberships?.[0]?.role || 'member'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back navigation */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-medium hover:-translate-x-1 duration-200"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <AnimatePresence mode="wait">
        {!editing ? (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW MODE
             ═══════════════════════════════════════════════════════════════════ */
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Profile Header Card */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-2xl shrink-0">
                  {getInitials(form.displayName || 'U')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{form.displayName}</h1>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${getRoleBadgeColor(membershipRole)}`}>
                      {membershipRole === 'co_lead' ? 'Co-Lead' : membershipRole.replace('_', ' ')}
                    </span>
                    {form.availability && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                        {form.availability}
                      </span>
                    )}
                  </div>
                  {form.username && (
                    <p className="text-sm text-zinc-500 mt-1 font-mono">@{form.username}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {form.city && form.showCity && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                        <MapPin size={13} className="text-zinc-500" />
                        {form.city}{form.country ? `, ${form.country}` : ''}
                      </span>
                    )}
                    {!form.city && form.country && form.showCity && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                        <MapPin size={13} className="text-zinc-500" />
                        {form.country}
                      </span>
                    )}
                    {/* Social handles inline */}
                    {form.xHandle && form.showXHandle && (
                      <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
                        <Twitter size={13} /> @{form.xHandle}
                      </span>
                    )}
                    {form.discord && form.showDiscord && (
                      <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
                        <MessageCircle size={13} /> {form.discord}
                      </span>
                    )}
                    {form.github && form.showGithub && (
                      <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
                        <Github size={13} /> {form.github}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm cursor-pointer shrink-0"
                >
                  <Pencil size={14} />
                  Edit Profile
                </button>
              </div>

              {/* Bio */}
              {form.bio && form.showBio && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-sm text-zinc-300 leading-relaxed">{form.bio}</p>
                </div>
              )}
            </div>

            {/* Tab: OVERVIEW */}
            <div className="border-b border-white/5">
              <div className="flex gap-6">
                <button className="pb-3 text-sm font-bold text-white border-b-2 border-red-500 cursor-pointer">
                  OVERVIEW
                </button>
              </div>
            </div>

            {/* Overview Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: Skills + Interests */}
              <div className="lg:col-span-2 space-y-6">
                {/* Skills */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Skills</h3>
                  {form.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill) => (
                        <span key={skill} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">No skills added yet</p>
                  )}
                </div>

                {/* Interests */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Interests</h3>
                  {form.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.interests.map((interest) => (
                        <span key={interest} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg">
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">No interests added yet</p>
                  )}
                </div>
              </div>

              {/* Right column: Roles + Contact */}
              <div className="space-y-6">
                {/* Roles */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Roles</h3>
                  {form.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.roles.map((role) => (
                        <span key={role} className="px-3 py-1.5 bg-white/10 border border-white/20 text-white text-sm rounded-lg">
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">No roles selected</p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Contact</h3>
                  <div className="space-y-3">
                    {form.telegram && form.showTelegram && (
                      <div className="flex items-center gap-3 text-sm">
                        <Send size={14} className="text-zinc-500" />
                        <span className="text-zinc-300">{form.telegram}</span>
                      </div>
                    )}
                    {form.discord && form.showDiscord && (
                      <div className="flex items-center gap-3 text-sm">
                        <MessageCircle size={14} className="text-zinc-500" />
                        <span className="text-zinc-300">{form.discord}</span>
                      </div>
                    )}
                    {form.walletAddress && form.showWallet && (
                      <div className="flex items-center gap-3 text-sm">
                        <Wallet size={14} className="text-zinc-500" />
                        <span className="text-zinc-300 font-mono text-xs truncate">{form.walletAddress}</span>
                      </div>
                    )}
                    {user?.email && form.showEmail && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={14} className="text-zinc-500" />
                        <span className="text-zinc-300">{user.email}</span>
                      </div>
                    )}
                    {form.socialLinks.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        {form.socialLinks.filter((l) => l.name && l.url).map((link, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <Globe size={14} className="text-zinc-500" />
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 truncate">
                              {link.name}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {!form.telegram && !form.discord && !form.walletAddress && form.socialLinks.length === 0 && (
                      <p className="text-sm text-zinc-600">No contact info added</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
              <Shield size={16} className="text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-500">
                Control what other members can see about you by clicking <strong className="text-zinc-400">Edit Profile</strong> and adjusting your privacy settings.
              </p>
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             EDIT MODE
             ═══════════════════════════════════════════════════════════════════ */
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Edit Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <Pencil size={18} className="text-zinc-200" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Edit Profile</h1>
                  <p className="text-xs text-zinc-500">Update your info and privacy preferences</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-white/5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Section 1: Basic Info */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Basic Info</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">Display Name *</label>
                  <input
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                    <input
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.username}
                      onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-300 font-medium">Bio</label>
                <textarea
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 min-h-[100px] resize-y"
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Tell others about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">City</label>
                  <input
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Your city"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">Country</label>
                  <div className="relative">
                    <select
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.country}
                      onChange={(e) => updateField('country', e.target.value)}
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.filter(Boolean).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-300 font-medium">Availability</label>
                <div className="relative">
                  <select
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/10"
                    value={form.availability}
                    onChange={(e) => updateField('availability', e.target.value)}
                  >
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Section 2: Social & Contact */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Social & Contact</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">X (Twitter)</label>
                  <div className="relative">
                    <Twitter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.xHandle}
                      onChange={(e) => updateField('xHandle', e.target.value)}
                      placeholder="handle (without @)"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">Discord</label>
                  <div className="relative">
                    <MessageCircle size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.discord}
                      onChange={(e) => updateField('discord', e.target.value)}
                      placeholder="username#0000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">Telegram</label>
                  <div className="relative">
                    <Send size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.telegram}
                      onChange={(e) => updateField('telegram', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-zinc-300 font-medium">GitHub</label>
                  <div className="relative">
                    <Github size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={form.github}
                      onChange={(e) => updateField('github', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-300 font-medium">Wallet Address</label>
                <div className="relative">
                  <Wallet size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 font-mono text-xs"
                    value={form.walletAddress}
                    onChange={(e) => updateField('walletAddress', e.target.value)}
                    placeholder="0x..."
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-zinc-300 font-medium">Custom Social Links</label>
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Plus size={12} /> Add Link
                  </button>
                </div>
                {form.socialLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={link.name}
                      onChange={(e) => updateSocialLink(i, 'name', e.target.value)}
                      placeholder="Label (e.g. Portfolio)"
                    />
                    <input
                      className="flex-[2] bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                      value={link.url}
                      onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(i)}
                      className="p-2 text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Skills & Interests */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Skills & Interests</h2>

              {/* Skills */}
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-300 font-medium">Skills</label>
                <p className="text-xs text-zinc-600 mb-2">Type a skill and press Enter to add</p>
                <TagInput
                  tags={form.skills}
                  onChange={(t) => updateField('skills', t)}
                  placeholder="e.g. Solidity, React, Rust..."
                />
              </div>

              {/* Interests */}
              <div className="space-y-3">
                <label className="block text-sm text-zinc-300 font-medium">Interests</label>
                <p className="text-xs text-zinc-600">Select from predefined or add your own</p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                        form.interests.includes(interest)
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {form.interests.includes(interest) && <Check size={12} className="inline mr-1.5" />}
                      {interest}
                    </button>
                  ))}
                </div>
                {/* Custom interests already added (non-predefined) */}
                {form.interests.filter((i) => !PREDEFINED_INTERESTS.includes(i)).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.interests.filter((i) => !PREDEFINED_INTERESTS.includes(i)).map((interest) => (
                      <span key={interest} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-white text-sm rounded-lg">
                        {interest}
                        <button type="button" onClick={() => toggleInterest(interest)} className="text-zinc-400 hover:text-white cursor-pointer">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomInterest() } }}
                    placeholder="Add custom interest..."
                  />
                  <button
                    type="button"
                    onClick={addCustomInterest}
                    className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-xl hover:bg-zinc-700 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-zinc-300 font-medium">Roles</label>
                  <span className="text-xs text-zinc-600">Select up to 3</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer text-center ${
                        form.roles.includes(role)
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      } ${!form.roles.includes(role) && form.roles.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={!form.roles.includes(role) && form.roles.length >= 3}
                    >
                      {form.roles.includes(role) && <Check size={12} className="inline mr-1" />}
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Privacy Settings */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={16} className="text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Privacy Settings</h2>
              </div>
              <p className="text-xs text-zinc-600 -mt-2">Choose what other community members can see on your profile</p>

              <div className="divide-y divide-white/5">
                <ToggleSwitch label="Show email to other members" enabled={form.showEmail} onChange={(v) => updateField('showEmail', v)} />
                <ToggleSwitch label="Show wallet address" enabled={form.showWallet} onChange={(v) => updateField('showWallet', v)} />
                <ToggleSwitch label="Show Discord handle" enabled={form.showDiscord} onChange={(v) => updateField('showDiscord', v)} />
                <ToggleSwitch label="Show Telegram handle" enabled={form.showTelegram} onChange={(v) => updateField('showTelegram', v)} />
                <ToggleSwitch label="Show X (Twitter) handle" enabled={form.showXHandle} onChange={(v) => updateField('showXHandle', v)} />
                <ToggleSwitch label="Show GitHub username" enabled={form.showGithub} onChange={(v) => updateField('showGithub', v)} />
                <ToggleSwitch label="Show city/location" enabled={form.showCity} onChange={(v) => updateField('showCity', v)} />
                <ToggleSwitch label="Show bio" enabled={form.showBio} onChange={(v) => updateField('showBio', v)} />
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 flex items-start gap-2.5 mt-4">
                <Eye size={14} className="text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-500">
                  Admins and regional leads can always see your full profile regardless of these settings.
                </p>
              </div>
            </div>

            {/* Bottom Save/Cancel */}
            <div className="flex items-center justify-end gap-3 pb-8">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-zinc-400 hover:text-white border border-white/5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
