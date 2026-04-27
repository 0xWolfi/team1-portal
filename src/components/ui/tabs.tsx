'use client'
import { cn } from '@/lib/helpers'

interface TabsProps {
  tabs: { value: string; label: string }[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
            active === tab.value
              ? 'bg-red-500 text-white shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
          )}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
