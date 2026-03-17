'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/helpers'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm text-zinc-300 font-medium">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full h-11 px-4 rounded-lg text-sm transition-colors duration-200',
            'bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500',
            'focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export { Input }
