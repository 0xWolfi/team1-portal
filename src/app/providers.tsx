'use client'
import { SessionProvider } from 'next-auth/react'
import { AuthProvider } from '@/context/auth-context'
import { ToastProvider } from '@/context/toast-context'
import { ThemeProvider } from '@/context/theme-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
