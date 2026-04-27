'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from '@/context/toast-context'
import { getSocialUrl, getSocialDisplay, type SocialPlatform } from '@/lib/socials'
import { cn } from '@/lib/helpers'

interface SocialLinkProps {
  platform: SocialPlatform
  handle: string | null | undefined
  className?: string
  iconOnly?: boolean
  showLabel?: boolean
  icon?: React.ReactNode
  label?: string
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  x: 'X',
  discord: 'Discord',
  telegram: 'Telegram',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  reddit: 'Reddit',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  farcaster: 'Farcaster',
  linktree: 'Linktree',
  podcast: 'Podcast',
  blog: 'Blog',
  website: 'Website',
  buildersHub: 'Builders Hub',
  arena: 'Arena',
}

const linkClass =
  'text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400 hover:underline underline-offset-2 transition-colors break-all'

export function SocialLink({
  platform,
  handle,
  className,
  iconOnly,
  showLabel,
  icon,
  label,
}: SocialLinkProps) {
  const { success } = useToast()
  const [copied, setCopied] = useState(false)

  if (!handle || !handle.trim()) return null

  const display = getSocialDisplay(platform, handle)
  const url = getSocialUrl(platform, handle)
  const platformLabel = label ?? PLATFORM_LABEL[platform]

  if (platform === 'discord') {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(display)
        setCopied(true)
        success('Copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore
      }
    }
    return (
      <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
        {icon}
        {!iconOnly && (
          <span className="text-zinc-700 dark:text-zinc-300 break-all">
            {showLabel ? `${platformLabel}: ` : ''}
            {display}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          aria-label={`Copy ${platformLabel} handle`}
          title={`Copy ${platformLabel} handle`}
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
      </span>
    )
  }

  if (!url) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
        {icon}
        {!iconOnly && (
          <span className="text-zinc-700 dark:text-zinc-300 break-all">
            {showLabel ? `${platformLabel}: ` : ''}
            {display}
          </span>
        )}
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-2 text-sm', linkClass, className)}
    >
      {icon}
      {!iconOnly && (
        <span>
          {showLabel ? `${platformLabel}: ` : ''}
          {display}
        </span>
      )}
    </a>
  )
}
