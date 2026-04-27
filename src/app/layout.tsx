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

// Synchronous script that runs before hydration to set the correct theme class
// on <html>, preventing a flash of the wrong theme on initial load.
const themeInitScript = `(function(){try{var s=localStorage.getItem('team1-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||'dark';var r=t==='system'?(m?'dark':'light'):t;var d=document.documentElement;if(r==='dark'){d.classList.add('dark');}else{d.classList.remove('dark');}d.style.colorScheme=r;}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={kanit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-white antialiased font-sans selection:bg-zinc-900/15 dark:selection:bg-white/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
