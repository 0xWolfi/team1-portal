import { cn } from '@/lib/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-5 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-700/50 dark:shadow-none',
        hover && 'transition-all duration-300 hover:border-red-500/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-500/10 dark:hover:shadow-lg dark:hover:shadow-red-500/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-medium text-zinc-900 dark:text-white', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-zinc-600 dark:text-zinc-400 mt-1', className)} {...props}>
      {children}
    </p>
  )
}
