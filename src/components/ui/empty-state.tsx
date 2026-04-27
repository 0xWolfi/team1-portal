import { cn } from '@/lib/helpers'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && <div className="text-zinc-400 dark:text-zinc-600 mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
