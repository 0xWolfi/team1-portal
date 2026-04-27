'use client'
import { useState } from 'react'
import { MessageCircleQuestion, X, Loader2, Send, Check } from 'lucide-react'

const inputClass =
  'w-full bg-white border border-zinc-200 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/10'

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: '', country: '', message: '' })

  const reset = () => {
    setForm({ name: '', email: '', role: '', country: '', message: '' })
    setError('')
    setSent(false)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.role || !form.country || !form.message) {
      setError('All fields are required')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.error || 'Failed to send')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setSent(false) }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium shadow-lg shadow-red-500/20 transition-all cursor-pointer"
      >
        <MessageCircleQuestion size={16} />
        Support
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-end sm:justify-end p-4">
          <div className="absolute inset-0 bg-zinc-900/30 dark:bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); reset() }} />
          <div className="relative w-full max-w-sm bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden sm:mr-4 sm:mb-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion size={18} className="text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Need help?</h3>
              </div>
              <button onClick={() => { setOpen(false); reset() }} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {sent ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Your message has been sent to the team1 admin team. We'll get back to you at <span className="text-zinc-900 dark:text-white font-medium">{form.email}</span>.</p>
                <button onClick={() => { setOpen(false); reset() }} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer">Close</button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-zinc-500 mb-1">Facing login issues or need assistance? Fill in the details below and we'll help you out.</p>

                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Full Name *</label>
                  <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Email *</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Role *</label>
                    <input className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Member, Lead" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Country *</label>
                    <input className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. India" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">What's the issue? *</label>
                  <textarea
                    className={`${inputClass} min-h-[70px] resize-y`}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your issue..."
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
