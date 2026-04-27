import { cn } from '@/lib/helpers'

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }
  const safeSrc = src && /^https?:\/\//i.test(src) ? src : null
  if (safeSrc) {
    return <img src={safeSrc} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  }
  return (
    <div className={cn('rounded-full bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center font-medium shrink-0', sizes[size], className)}>
      {getInitials(name)}
    </div>
  )
}
