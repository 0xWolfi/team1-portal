import { z } from 'zod'


const BLOCKED_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'temp-mail.org', '10minutemail.com',
  'fakeinbox.com', 'tempail.com', 'maildrop.cc', 'getairmail.com',
  'mohmal.com', 'burnermail.io', 'discard.email', 'tmpmail.net',
  'tmpmail.org', 'getnada.com', 'emailondeck.com', 'incognitomail.com',
]

export const applicationSchema = z.object({
  fullName: z.string().min(2, 'Required').max(200),
  email: z.string().email('Invalid email').toLowerCase().trim()
    .refine(email => {
      const domain = email.split('@')[1]
      return !BLOCKED_EMAIL_DOMAINS.includes(domain)
    }, 'Please use a valid, non-temporary email address'),
  discord: z.string().min(2, 'Discord handle is required'),
  xHandle: z.string().min(2, 'X handle is required'),
  telegram: z.string().optional(),
  github: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  city: z.string().optional(),
  interests: z.string().optional(),
  interestsOther: z.string().optional(),
  familiarity: z.string().optional(),
  excitement: z.string().min(10, 'Please write at least a couple sentences'),
  portfolioLink: z.string().optional(),
  portfolioContext: z.string().optional(),
  timeCommitment: z.string().optional(),
  anythingElse: z.string().optional(),
})

export const playbookSchema = z.object({
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  visibility: z.enum(['public', 'member']).default('member'),
  status: z.enum(['draft', 'published']).default('draft'),
  regionId: z.string().min(1, 'Region is required'),
})

export const programSchema = z.object({
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  eligibility: z.string().optional(),
  benefits: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  regionId: z.string().min(1, 'Region is required'),
})

export const guideSchema = z.object({
  title: z.string().min(1, 'Required').max(200),
  slug: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  content: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  readTime: z.number().optional(),
  visibility: z.enum(['public', 'member']).default('member'),
  status: z.enum(['draft', 'published']).default('draft'),
  regionId: z.string().min(1, 'Region is required'),
})

export const announcementSchema = z.object({
  title: z.string().min(1, 'Required').max(200),
  content: z.string().min(1, 'Required'),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  isGlobal: z.boolean().default(false),
  expiresAt: z.string().optional(),
  regionId: z.string().optional(),
})

export const regionSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  slug: z.string().optional(),
  country: z.string().optional(),
  countries: z.string().nullable().optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Partial schemas for PUT/PATCH handlers
export const playbookUpdateSchema = playbookSchema.omit({ regionId: true }).partial()
export const programUpdateSchema = programSchema.omit({ regionId: true }).partial()
export const guideUpdateSchema = guideSchema.omit({ regionId: true }).partial()
export const regionUpdateSchema = regionSchema.partial()

// Lead assignment
export const leadAssignmentSchema = z.object({
  email: z.string().email('Invalid email'),
  regionId: z.string().min(1, 'Region is required'),
  role: z.enum(['lead', 'co_lead']).default('lead'),
})

// Member assignment
export const memberAssignmentSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  regionId: z.string().optional(),
  role: z.enum(['member', 'lead', 'co_lead', 'super_admin', 'community_ops']).default('member'),
}).refine(
  (data) => data.role === 'super_admin' || data.role === 'community_ops' || (data.regionId && data.regionId.length > 0),
  { message: 'Region is required', path: ['regionId'] },
)

// Notification update
export const notificationUpdateSchema = z.object({
  markAllRead: z.boolean().optional(),
  id: z.string().optional(),
})

// Admin user update (status, admin notes, regional TG flag, cohort)
export const userStatusEnum = z.enum(['active', 'flagged', 'paused', 'inactive', 'removed'])
export const adminUserUpdateSchema = z.object({
  status: userStatusEnum.optional(),
  adminNotes: z.string().max(5000).optional().nullable(),
  cohort: z.union([z.number(), z.string()]).optional().nullable(),
  inRegionalTg: z.boolean().optional().nullable(),
})

// Self-editable profile fields
// NOTE: most fields are `.optional().nullable()` so that empty strings sent from
// the form (e.g. an unset username) don't fail validation and silently kill the
// entire save. `displayName`/`username` accept empty string too — the page
// enforces non-empty `displayName` client-side, and DB-level uniqueness handles
// username conflicts.
export const selfEditableProfileSchema = z.object({
  displayName: z.string().max(100).optional().nullable(),
  username: z.string().max(50).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  bio: z.string().max(500).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  discord: z.string().max(100).optional().nullable(),
  xHandle: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  studentStatus: z.string().max(50).optional().nullable(),
  university: z.string().max(200).optional().nullable(),
  languages: z.string().max(500).optional().nullable(),
  cohort: z.union([z.number(), z.string()]).optional().nullable(),
  telegram: z.string().max(100).optional().nullable(),
  github: z.string().max(100).optional().nullable(),
  linkedin: z.string().max(200).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  reddit: z.string().max(100).optional().nullable(),
  arena: z.string().max(100).optional().nullable(),
  youtube: z.string().max(200).optional().nullable(),
  tiktok: z.string().max(100).optional().nullable(),
  twitch: z.string().max(100).optional().nullable(),
  farcaster: z.string().max(100).optional().nullable(),
  linktree: z.string().max(200).optional().nullable(),
  podcast: z.string().max(200).optional().nullable(),
  blog: z.string().max(200).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  walletAddress: z.string().max(200).optional().nullable(),
  skills: z.string().max(1000).optional().nullable(),
  interests: z.string().max(1000).optional().nullable(),
  roles: z.string().max(500).optional().nullable(),
  availability: z.string().max(2000).optional().nullable(),
  availabilityHours: z.number().int().min(1).max(168).optional().nullable(),
  socialLinks: z.string().max(2000).optional().nullable(),
  eventHostingPrefs: z.string().max(1000).optional().nullable(),
  cChainAddress: z.string().max(200).optional().nullable(),
  developmentGoals: z.string().max(2000).optional().nullable(),
  shippingAddress: z.string().max(1000).optional().nullable(),
  merchSizes: z.string().max(500).optional().nullable(),
  unisexTshirtSize: z.string().max(20).optional().nullable(),
  unisexHoodieSize: z.string().max(20).optional().nullable(),
  unisexPantsSize: z.string().max(20).optional().nullable(),
  womensTshirtSize: z.string().max(20).optional().nullable(),
  womensHoodieSize: z.string().max(20).optional().nullable(),
  womensPantsSize: z.string().max(20).optional().nullable(),
  privacySettings: z.string().max(2000).optional().nullable(),
})
