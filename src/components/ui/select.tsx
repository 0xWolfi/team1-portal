'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/helpers'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm text-zinc-300 font-medium">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'w-full h-11 px-4 rounded-lg text-sm cursor-pointer appearance-none transition-colors duration-200',
            'bg-zinc-900 border border-zinc-700 text-zinc-200',
            'focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
export { Select }
