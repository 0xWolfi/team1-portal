export interface AuthUser {
  id: string
  email: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
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
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  adminRole?: { role: string } | null
  memberships?: Membership[]
}

export interface Membership {
  id: string
  regionId: string
  role: string // member, lead, co_lead
  status: string // pending, accepted, rejected
  isPrimary: boolean
  region: Region
}

export interface Region {
  id: string
  name: string
  slug: string
  country: string | null
  description: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  isActive: boolean
  sortOrder: number
  _count?: { memberships: number }
}

export interface Playbook {
  id: string
  regionId: string
  title: string
  description: string | null
  content: string | null
  coverImageUrl: string | null
  visibility: string
  status: string
  createdById: string
  createdAt: string
  updatedAt: string
  region?: Region
  creator?: { displayName: string; username: string | null }
}

export interface Program {
  id: string
  regionId: string
  title: string
  description: string | null
  content: string | null
  eligibility: string | null
  benefits: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  region?: Region
  creator?: { displayName: string; username: string | null }
}

export interface Guide {
  id: string
  regionId: string
  title: string
  slug: string
  category: string | null
  content: string | null
  coverImageUrl: string | null
  readTime: number | null
  visibility: string
  status: string
  createdById: string
  createdAt: string
  updatedAt: string
  region?: Region
  creator?: { displayName: string; username: string | null }
}

export interface Announcement {
  id: string
  regionId: string | null
  title: string
  content: string
  priority: string
  isGlobal: boolean
  expiresAt: string | null
  createdById: string
  createdAt: string
  region?: Region
  creator?: { displayName: string; username: string | null }
}

export interface MembershipApplication {
  id: string
  fullName: string
  email: string
  discord: string
  xHandle: string
  telegram: string | null
  github: string | null
  country: string
  city: string | null
  interests: string | null
  interestsOther: string | null
  familiarity: string | null
  excitement: string | null
  portfolioLink: string | null
  portfolioContext: string | null
  timeCommitment: string | null
  anythingElse: string | null
  status: string
  reviewedBy: string | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  module: string
  entityType: string | null
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user?: { displayName: string; email: string } | null
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
