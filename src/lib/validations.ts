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
  description: z.string().max(500).optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
})
