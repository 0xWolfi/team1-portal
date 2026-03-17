import { cn } from '@/lib/helpers'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-[10px] font-medium rounded-full border whitespace-nowrap',
        variant === 'default' && 'bg-zinc-800 text-zinc-300 border-zinc-700',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        variant === 'warning' && 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        variant === 'danger' && 'bg-red-500/15 text-red-400 border-red-500/25',
        variant === 'info' && 'bg-blue-500/15 text-blue-400 border-blue-500/25',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
