'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/helpers'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
          'disabled:opacity-50 disabled:pointer-events-none',
          // Variants
          variant === 'primary' && 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
          variant === 'secondary' && 'border border-red-500 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-[0.98]',
          variant === 'ghost' && 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 active:scale-[0.98]',
          variant === 'danger' && 'bg-red-700 text-white hover:bg-red-800 active:scale-[0.98]',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-xs rounded-lg',
          size === 'md' && 'h-10 px-4 text-sm rounded-lg',
          size === 'lg' && 'h-12 px-6 text-base rounded-xl',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export { Button }
