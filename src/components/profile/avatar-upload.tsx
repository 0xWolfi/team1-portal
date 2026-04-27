'use client'
import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { useToast } from '@/context/toast-context'
import { getInitials, cn } from '@/lib/helpers'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  displayName: string
  onUploadComplete: (url: string) => void | Promise<void>
  size?: 'md' | 'lg' | 'xl'
  disabled?: boolean
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function AvatarUpload({
  currentAvatarUrl,
  displayName,
  onUploadComplete,
  size = 'xl',
  disabled,
}: AvatarUploadProps) {
  const { error: showError } = useToast()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const sizeClass =
    size === 'md' ? 'w-16 h-16 text-lg' :
    size === 'lg' ? 'w-20 h-20 text-2xl' :
    'w-24 h-24 text-3xl'

  const safeSrc = previewUrl || (currentAvatarUrl && /^https?:\/\//i.test(currentAvatarUrl) ? currentAvatarUrl : null)

  const handlePick = () => {
    if (uploading || disabled) return
    fileRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Please select a JPG, PNG, WebP, or GIF image')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      showError('Image must be smaller than 5 MB')
      return
    }

    const tempUrl = URL.createObjectURL(file)
    setPreviewUrl(tempUrl)
    setUploading(true)

    try {
      const sigRes = await fetch('/api/upload/signature', {
        method: 'POST',
        credentials: 'include',
      })
      const sigJson = await sigRes.json()
      if (!sigRes.ok || !sigJson.success) {
        throw new Error(sigJson.error || 'Could not get upload signature')
      }
      const { signature, timestamp, apiKey, cloudName, folder } = sigJson.data as {
        signature: string
        timestamp: number
        apiKey: string
        cloudName: string
        folder: string
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', apiKey)
      formData.append('folder', folder)

      const cdRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const cdData = await cdRes.json()
      if (!cdRes.ok) {
        throw new Error(cdData?.error?.message || 'Upload failed')
      }
      const secureUrl: string | undefined = cdData.secure_url
      if (!secureUrl) throw new Error('Cloudinary did not return a URL')

      await onUploadComplete(secureUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      showError(msg)
      setPreviewUrl(null)
    } finally {
      URL.revokeObjectURL(tempUrl)
      setUploading(false)
    }
  }

  return (
    <div className="relative inline-block group">
      <button
        type="button"
        onClick={handlePick}
        disabled={uploading || disabled}
        className={cn(
          'relative rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 cursor-pointer',
          'bg-gradient-to-br from-red-100 to-red-50 border border-red-200 text-red-700',
          'dark:from-red-500/20 dark:to-red-600/10 dark:border-red-500/20 dark:text-red-400',
          'transition-all duration-200',
          'hover:ring-2 hover:ring-red-500/50 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-zinc-900',
          uploading && 'opacity-80',
          disabled && 'cursor-not-allowed opacity-60',
          sizeClass,
        )}
        aria-label="Change profile picture"
      >
        {safeSrc ? (
          <img src={safeSrc} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(displayName || 'U')}</span>
        )}
        <div className={cn(
          'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity',
          uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}>
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
