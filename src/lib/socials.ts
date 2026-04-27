export type SocialPlatform =
  | 'x'
  | 'discord'
  | 'telegram'
  | 'github'
  | 'linkedin'
  | 'instagram'
  | 'reddit'
  | 'youtube'
  | 'tiktok'
  | 'twitch'
  | 'farcaster'
  | 'linktree'
  | 'podcast'
  | 'blog'
  | 'website'
  | 'buildersHub'
  | 'arena'

function clean(s: string): string {
  return s.trim()
}

function stripAt(s: string): string {
  return s.replace(/^@+/, '')
}

function isFullUrl(s: string): boolean {
  return /^https?:\/\//i.test(s)
}

function bareHost(s: string): string {
  return s.replace(/^https?:\/\/(www\.)?/i, '')
}

function lastPathSegment(s: string): string {
  const noQuery = s.split(/[?#]/)[0]
  const trimmed = noQuery.replace(/\/+$/, '')
  const segs = trimmed.split('/').filter(Boolean)
  return segs[segs.length - 1] || ''
}

function extractHandle(input: string, knownDomains: string[]): string {
  let s = clean(input)
  if (!s) return ''
  if (isFullUrl(s)) {
    let host = bareHost(s)
    for (const d of knownDomains) {
      if (host.toLowerCase().startsWith(d.toLowerCase())) {
        host = host.slice(d.length)
        break
      }
    }
    s = host
  }
  s = s.split(/[?#]/)[0]
  s = s.replace(/^\/+/, '').replace(/\/+$/, '')
  s = stripAt(s)
  if (s.includes('/')) s = lastPathSegment(s)
  return s
}

function ensureUrlScheme(s: string): string {
  const t = clean(s)
  if (!t) return ''
  if (isFullUrl(t)) return t
  return `https://${t.replace(/^\/+/, '')}`
}

function nonEmpty(handle: string | null | undefined): string | null {
  if (!handle) return null
  const t = clean(handle)
  return t.length > 0 ? t : null
}

export function getSocialUrl(
  platform: SocialPlatform,
  handle: string | null | undefined,
): string | null {
  const raw = nonEmpty(handle)
  if (!raw) return null

  switch (platform) {
    case 'x': {
      const h = extractHandle(raw, ['x.com/', 'twitter.com/'])
      if (!h) return null
      return `https://x.com/${h}`
    }
    case 'discord':
      return null
    case 'telegram': {
      const h = extractHandle(raw, ['t.me/', 'telegram.me/', 'telegram.org/'])
      if (!h) return null
      return `https://t.me/${h}`
    }
    case 'github': {
      const h = extractHandle(raw, ['github.com/'])
      if (!h) return null
      return `https://github.com/${h}`
    }
    case 'linkedin': {
      if (isFullUrl(raw)) return raw
      const cleaned = stripAt(raw).replace(/^\/+/, '').replace(/\/+$/, '')
      if (!cleaned) return null
      if (/^(in|company|school)\//i.test(cleaned)) {
        return `https://linkedin.com/${cleaned}`
      }
      return `https://linkedin.com/in/${cleaned}`
    }
    case 'instagram': {
      const h = extractHandle(raw, ['instagram.com/', 'instagr.am/'])
      if (!h) return null
      return `https://instagram.com/${h}`
    }
    case 'reddit': {
      let s = clean(raw)
      if (isFullUrl(s)) {
        s = bareHost(s).replace(/^reddit\.com\//i, '')
      }
      s = s.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '')
      s = s.replace(/^(user|u)\//i, '')
      s = stripAt(s)
      if (!s) return null
      return `https://reddit.com/user/${s}`
    }
    case 'youtube': {
      if (isFullUrl(raw)) return raw
      const cleaned = clean(raw).replace(/^\/+/, '').replace(/\/+$/, '')
      if (!cleaned) return null
      if (cleaned.startsWith('@')) {
        return `https://youtube.com/${cleaned}`
      }
      if (/^(c|channel|user)\//i.test(cleaned)) {
        return `https://youtube.com/${cleaned}`
      }
      return `https://youtube.com/@${stripAt(cleaned)}`
    }
    case 'tiktok': {
      const h = extractHandle(raw, ['tiktok.com/', 'vm.tiktok.com/'])
      if (!h) return null
      return `https://tiktok.com/@${h}`
    }
    case 'twitch': {
      const h = extractHandle(raw, ['twitch.tv/'])
      if (!h) return null
      return `https://twitch.tv/${h}`
    }
    case 'farcaster': {
      const h = extractHandle(raw, ['warpcast.com/', 'farcaster.xyz/'])
      if (!h) return null
      return `https://warpcast.com/${h}`
    }
    case 'linktree': {
      if (isFullUrl(raw)) return raw
      const h = extractHandle(raw, ['linktr.ee/', 'linktree.com/'])
      if (!h) return null
      return `https://linktr.ee/${h}`
    }
    case 'podcast':
    case 'blog':
    case 'website': {
      const url = ensureUrlScheme(raw)
      return url || null
    }
    case 'buildersHub': {
      if (isFullUrl(raw)) return raw
      const h = extractHandle(raw, ['app.buildershub.io/profile/', 'buildershub.io/profile/'])
      if (!h) return null
      return `https://app.buildershub.io/profile/${h}`
    }
    case 'arena':
      return null
    default:
      return null
  }
}

export function getSocialDisplay(
  platform: SocialPlatform,
  handle: string | null | undefined,
): string {
  const raw = nonEmpty(handle)
  if (!raw) return ''

  switch (platform) {
    case 'discord':
      return stripAt(raw)
    case 'arena':
      return stripAt(raw)
    case 'x':
    case 'telegram':
    case 'github':
    case 'instagram':
    case 'tiktok':
    case 'twitch':
    case 'farcaster':
    case 'buildersHub': {
      const knownDomains: Record<string, string[]> = {
        x: ['x.com/', 'twitter.com/'],
        telegram: ['t.me/', 'telegram.me/', 'telegram.org/'],
        github: ['github.com/'],
        instagram: ['instagram.com/', 'instagr.am/'],
        tiktok: ['tiktok.com/', 'vm.tiktok.com/'],
        twitch: ['twitch.tv/'],
        farcaster: ['warpcast.com/', 'farcaster.xyz/'],
        buildersHub: ['app.buildershub.io/profile/', 'buildershub.io/profile/'],
      }
      const h = extractHandle(raw, knownDomains[platform] || [])
      return h ? `@${h}` : raw
    }
    case 'reddit': {
      let s = clean(raw)
      if (isFullUrl(s)) s = bareHost(s).replace(/^reddit\.com\//i, '')
      s = s.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '')
      s = s.replace(/^(user|u)\//i, '')
      s = stripAt(s)
      return s ? `u/${s}` : raw
    }
    case 'linkedin': {
      if (isFullUrl(raw)) {
        const host = bareHost(raw).replace(/\/+$/, '')
        return host
      }
      const cleaned = stripAt(raw).replace(/^\/+/, '').replace(/\/+$/, '')
      return cleaned || raw
    }
    case 'youtube': {
      if (isFullUrl(raw)) {
        const host = bareHost(raw).replace(/\/+$/, '')
        return host
      }
      const cleaned = clean(raw).replace(/^\/+/, '').replace(/\/+$/, '')
      if (!cleaned) return raw
      if (cleaned.startsWith('@')) return cleaned
      if (/^(c|channel|user)\//i.test(cleaned)) return cleaned
      return `@${stripAt(cleaned)}`
    }
    case 'linktree': {
      if (isFullUrl(raw)) return bareHost(raw).replace(/\/+$/, '')
      return raw
    }
    case 'podcast':
    case 'blog':
    case 'website': {
      if (isFullUrl(raw)) return bareHost(raw).replace(/\/+$/, '')
      return raw
    }
    default:
      return raw
  }
}
