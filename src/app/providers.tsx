'use client'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/context/auth-context'
import { ToastProvider } from '@/context/toast-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
