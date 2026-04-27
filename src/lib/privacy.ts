/**
 * Per-field profile visibility enforcement.
 *
 * Each profile field falls into one of three classes:
 *  - ALWAYS_PUBLIC: required identity/contact fields (e.g. country, discord)
 *  - LEAD_ONLY:     fields that only Global/Region Leads + super admins ever see
 *  - PER_USER:      everything else — visibility comes from User.privacySettings
 *                   ('public' | 'members' | 'leads_only', defaults to 'members')
 *
 * Callers pass the raw user record + viewer context; we return a copy with any
 * fields the viewer is not allowed to see set to null.
 */

export type Visibility = 'public' | 'members' | 'leads_only'

export const ALWAYS_PUBLIC_FIELDS = new Set([
  'id',
  'displayName',
  'username',
  'avatarUrl',
  'bio',
  'title',
  'country',
  'discord',
  'xHandle',
  'roles',
  'availability',
  'availabilityHours',
  'status',
  'createdAt',
])

export const LEAD_ONLY_FIELDS = new Set([
  'cChainAddress',
  'developmentGoals',
  'shippingAddress',
  'merchSizes',
  'unisexTshirtSize',
  'unisexHoodieSize',
  'unisexPantsSize',
  'womensTshirtSize',
  'womensHoodieSize',
  'womensPantsSize',
  'walletAddress',
  'adminNotes',
  'inRegionalTg',
  'cohort',
])

const DEFAULT_VISIBILITY: Visibility = 'members'

export interface ViewerContext {
  /** The viewer's user id; null/undefined for anonymous. */
  viewerId?: string | null
  /** True if viewer is authenticated (signed in to the portal). */
  isMember: boolean
  /** True if viewer is a super_admin. */
  isAdmin: boolean
  /** Slugs of regions where the viewer is lead/co_lead. */
  leadRegionSlugs?: string[]
  /** Slugs of regions the *target* user is a member of. */
  targetRegionSlugs?: string[]
}

function parsePrivacy(json: string | null | undefined): Record<string, Visibility> {
  if (!json) return {}
  try {
    const v = JSON.parse(json)
    return typeof v === 'object' && v !== null ? (v as Record<string, Visibility>) : {}
  } catch {
    return {}
  }
}

function viewerIsLeadForTarget(viewer: ViewerContext): boolean {
  if (viewer.isAdmin) return true
  const lead = viewer.leadRegionSlugs ?? []
  const tgt = viewer.targetRegionSlugs ?? []
  if (lead.length === 0 || tgt.length === 0) return false
  return tgt.some((s) => lead.includes(s))
}

function canSee(visibility: Visibility, viewer: ViewerContext, isSelf: boolean): boolean {
  if (isSelf || viewer.isAdmin) return true
  if (visibility === 'public') return true
  if (visibility === 'members') return viewer.isMember
  if (visibility === 'leads_only') return viewerIsLeadForTarget(viewer)
  return false
}

/**
 * Strip fields the viewer is not allowed to see. Returns a new object;
 * disallowed fields are set to null (so client shape stays stable).
 */
export function filterProfileByPrivacy<T extends Record<string, unknown> & { id?: string; privacySettings?: string | null }>(
  user: T,
  viewer: ViewerContext,
): T {
  const isSelf = !!viewer.viewerId && viewer.viewerId === user.id
  if (isSelf || viewer.isAdmin) return user

  const settings = parsePrivacy(user.privacySettings ?? null)
  const out: Record<string, unknown> = { ...user }

  for (const key of Object.keys(out)) {
    if (ALWAYS_PUBLIC_FIELDS.has(key)) continue
    if (key === 'privacySettings') {
      // Don't leak the privacy config itself to other viewers.
      out[key] = null
      continue
    }
    if (LEAD_ONLY_FIELDS.has(key)) {
      if (!canSee('leads_only', viewer, isSelf)) out[key] = null
      continue
    }
    const v = (settings[key] ?? DEFAULT_VISIBILITY) as Visibility
    if (!canSee(v, viewer, isSelf)) out[key] = null
  }

  return out as T
}

/**
 * Same as filterProfileByPrivacy but for a list of users that share one
 * viewer context (e.g. directory listing).
 */
export function filterProfileListByPrivacy<T extends Record<string, unknown> & { id?: string; privacySettings?: string | null }>(
  users: T[],
  viewerFor: (u: T) => ViewerContext,
): T[] {
  return users.map((u) => filterProfileByPrivacy(u, viewerFor(u)))
}
