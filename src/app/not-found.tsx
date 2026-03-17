import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-zinc-600">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-zinc-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )
}
