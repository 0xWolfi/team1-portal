'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { MemberActivity } from '@/types'
import { ActivityDialog } from '@/components/activities/activity-dialog'

interface Props {
  onCreated?: (activity: MemberActivity) => void
  className?: string
}

export function AddActivityButton({ onCreated, className = '' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0 ${className}`}
      >
        <Plus size={14} /> Add Activity
      </button>
      <ActivityDialog
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(activity) => {
          onCreated?.(activity)
        }}
      />
    </>
  )
}
