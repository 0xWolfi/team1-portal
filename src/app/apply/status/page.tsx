'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/helpers'
import { Search, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/applications/status?email=${encodeURIComponent(email)}`)
      const json = await res.json()
      if (json.success) setResult(json.data)
      else setError(json.error || 'Not found')
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const statusConfig: Record<string, { icon: React.ReactNode; variant: 'warning' | 'success' | 'danger'; label: string }> = {
    pending: { icon: <Clock size={24} />, variant: 'warning', label: 'Pending Review' },
    approved: { icon: <CheckCircle size={24} />, variant: 'success', label: 'Approved' },
    rejected: { icon: <XCircle size={24} />, variant: 'danger', label: 'Rejected' },
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient relative">
      <div className="grain absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="text-center mb-6">
          <img src="/logos/Team1_Symbol_Main.svg" alt="team1" className="h-10 w-10 mx-auto mb-3" />
          <h1 className="text-2xl font-medium text-white">Application Status</h1>
          <p className="text-sm text-zinc-400 mt-1">Enter your email to check your application</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6">
          <form onSubmit={handleCheck} className="flex gap-2 mb-4">
            <Input placeholder="your@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1" />
            <Button type="submit" loading={loading}><Search size={16} /></Button>
          </form>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center space-y-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                result.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                result.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {statusConfig[result.status]?.icon}
              </div>
              <Badge variant={statusConfig[result.status]?.variant}>{statusConfig[result.status]?.label}</Badge>
              <p className="text-sm text-white">{result.fullName}</p>
              <p className="text-xs text-zinc-400">Applied: {formatDate(result.createdAt)}</p>
              {result.reviewNote && <p className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3">{result.reviewNote}</p>}
            </motion.div>
          )}
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <Link href="/apply"><Button variant="ghost" size="sm">Apply</Button></Link>
          <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
        </div>
      </motion.div>
    </div>
  )
}
