'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const { user, signup, loading } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }

    setSubmitting(true)
    const res = await signup(form)
    if (res.success) router.push('/dashboard')
    else setError(res.error || 'Signup failed')
    setSubmitting(false)
  }

  if (loading || user) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient relative">
      <div className="grain absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="text-center mb-8">
          <img src="/logos/Team1_Symbol_Main.svg" alt="team1" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-white">Create your account</h1>
          <p className="text-sm text-zinc-400 mt-1">Join the team1 community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </motion.div>
          )}

          <Input label="Full Name" placeholder="Your full name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

          <Button type="submit" loading={submitting} className="w-full" size="lg">Create Account</Button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Already have an account?{' '}<Link href="/login" className="text-red-500 hover:underline">Sign In</Link>
        </p>
        <p className="text-center text-[10px] text-zinc-600 mt-8">&copy; {new Date().getFullYear()} team1. All rights reserved.</p>
      </motion.div>
    </div>
  )
}
