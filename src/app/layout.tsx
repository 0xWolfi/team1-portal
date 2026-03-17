import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const kanit = Kanit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: 'team1 Portal',
  description: 'team1 Member Portal - Avalanche Community Hub',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={kanit.variable}>
      <body className="min-h-screen bg-black text-white antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
