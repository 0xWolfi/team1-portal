'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl text-zinc-700 dark:text-zinc-200">!</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-6">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
