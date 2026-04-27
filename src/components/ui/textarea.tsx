'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/helpers'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm text-zinc-700 dark:text-zinc-300 font-medium">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            'w-full min-h-[100px] px-4 py-3 rounded-lg text-sm resize-y transition-colors duration-200',
            'bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
            'dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500',
            'focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
export { Textarea }
