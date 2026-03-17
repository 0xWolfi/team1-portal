import { cn } from '@/lib/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-5 bg-zinc-900 border border-zinc-700/50',
        hover && 'transition-all duration-300 hover:border-red-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/5',
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
    <h3 className={cn('text-lg font-medium text-white', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-zinc-400 mt-1', className)} {...props}>
      {children}
    </p>
  )
}
